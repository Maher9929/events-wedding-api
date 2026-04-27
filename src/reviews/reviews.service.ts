import {
  Injectable,
  Inject,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeSearch } from '../common/sanitize';
import { addReviewAliases, normalizeReview, mapArray } from '../common/response-compat';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './entities/review.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async create(clientId: string, dto: CreateReviewDto): Promise<Review> {
    // 1. Check if user actually has a COMPLETED booking for this provider's service
    const { data: service } = await this.supabase
      .from('services')
      .select('provider_id')
      .eq('id', dto.service_id)
      .single();

    if (!service) {
      throw new ForbiddenException('Service not found');
    }

    const { data: pastBookings } = await this.supabase
      .from('bookings')
      .select('id')
      .eq('client_id', clientId)
      .eq('provider_id', service.provider_id)
      .eq('status', 'completed')
      .limit(1);

    if (!pastBookings || pastBookings.length === 0) {
      throw new ForbiddenException(
        'You can only review providers after a completed booking',
      );
    }

    // 2. Check if user already reviewed this service
    const { data: existing } = await this.supabase
      .from('reviews')
      .select('id')
      .eq('service_id', dto.service_id)
      .eq('client_id', clientId)
      .single();

    if (existing) {
      throw new ConflictException('You have already reviewed this service');
    }

    const { data, error } = await this.supabase
      .from('reviews')
      .insert({
        service_id: dto.service_id,
        client_id: clientId,
        rating: dto.rating,
        comment: dto.comment,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Update provider rating
    await this.updateProviderRating(dto.service_id);

    return addReviewAliases(data);
  }

  async findAll(
    rating?: number,
    limit?: number,
    offset?: number,
    search?: string,
    sortBy?: string,
    sortOrder?: string,
  ): Promise<{ data: Review[]; total: number }> {
    let q = this.supabase
      .from('reviews')
      .select(
        `
        *,
        user_profiles(id, full_name, email, avatar_url),
        services(id, title)
      `,
        { count: 'exact' },
      )
      .order(sortBy === 'rating' ? 'rating' : 'created_at', {
        ascending: sortOrder === 'asc',
      });

    if (rating) {
      q = q.eq('rating', rating);
    }

    if (search) {
      q = q.ilike('comment', `%${sanitizeSearch(search)}%`);
    }

    if (limit !== undefined && offset !== undefined) {
      q = q.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await q;
    if (error) throw new BadRequestException(error.message);
    return { data: mapArray(data || [], normalizeReview), total: count || 0 };
  }

  async findByService(serviceId: string): Promise<Review[]> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select(
        `
        *,
        user_profiles(id, full_name, avatar_url)
      `,
      )
      .eq('service_id', serviceId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return mapArray(data || [], normalizeReview);
  }

  async getAverageRating(
    serviceId: string,
  ): Promise<{ average: number; count: number }> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select('rating')
      .eq('service_id', serviceId);

    if (error) throw new BadRequestException(error.message);

    const ratings = data || [];
    const count = ratings.length;
    const average =
      count > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / count : 0;

    return { average: Math.round(average * 10) / 10, count };
  }

  async findByProvider(
    providerId: string,
    rating?: number,
    limit?: number,
    offset?: number,
    sortBy?: string,
    sortOrder?: string,
  ): Promise<{ data: Review[]; total: number }> {
    // Get all service IDs for this provider
    const { data: services } = await this.supabase
      .from('services')
      .select('id')
      .eq('provider_id', providerId);

    if (!services || services.length === 0) return { data: [], total: 0 };
    const serviceIds = services.map((s) => s.id);

    let q = this.supabase
      .from('reviews')
      .select(
        `
        *,
        user_profiles(id, full_name, avatar_url),
        services(id, title)
      `,
        { count: 'exact' },
      )
      .in('service_id', serviceIds)
      .order(sortBy === 'rating' ? 'rating' : 'created_at', {
        ascending: sortOrder === 'asc',
      });

    if (rating) {
      q = q.eq('rating', rating);
    }

    if (limit !== undefined && offset !== undefined) {
      q = q.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await q;
    if (error) throw new BadRequestException(error.message);
    return { data: mapArray(data || [], normalizeReview), total: count || 0 };
  }

  async remove(id: string, clientId: string): Promise<void> {
    const { data: review } = await this.supabase
      .from('reviews')
      .select('client_id, service_id')
      .eq('id', id)
      .single();

    if (!review || review.client_id !== clientId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    const { error } = await this.supabase.from('reviews').delete().eq('id', id);

    if (error) throw new BadRequestException(error.message);

    await this.updateProviderRating(review.service_id);
  }

  private async updateProviderRating(serviceId: string): Promise<void> {
    // Get provider_id from service
    const { data: service } = await this.supabase
      .from('services')
      .select('provider_id')
      .eq('id', serviceId)
      .single();

    if (!service) return;

    // Get all reviews for all services of this provider
    const { data: providerServices } = await this.supabase
      .from('services')
      .select('id')
      .eq('provider_id', service.provider_id);

    if (!providerServices || providerServices.length === 0) return;

    const serviceIds = providerServices.map((s) => s.id);

    const { data: reviews } = await this.supabase
      .from('reviews')
      .select('rating')
      .in('service_id', serviceIds);

    const allRatings = reviews || [];
    const count = allRatings.length;
    const avg =
      count > 0 ? allRatings.reduce((sum, r) => sum + r.rating, 0) / count : 0;

    await this.supabase
      .from('providers')
      .update({
        rating_avg: Math.round(avg * 10) / 10,
        review_count: count,
      })
      .eq('id', service.provider_id);
  }

  async reportReview(
    id: string,
    reportedBy: string,
    reason: string,
  ): Promise<{ success: boolean }> {
    const { error } = await this.supabase
      .from('reviews')
      .update({
        is_reported: true,
        report_reason: reason,
        reported_by: reportedBy,
      })
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }
}
