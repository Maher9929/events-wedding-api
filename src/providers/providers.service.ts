import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { QueryProviderDto } from './dto/query-provider.dto';
import {
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
} from './dto/availability.dto';
import { Provider } from './entities/provider.entity';

@Injectable()
export class ProvidersService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) { }

  async create(
    userId: string,
    createProviderDto: CreateProviderDto,
  ): Promise<Provider> {
    // Check if provider already exists for this user
    const { data: existing } = await this.supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      throw new ConflictException(
        'Provider profile already exists for this user',
      );
    }

    const { data, error } = await this.supabase
      .from('providers')
      .insert({
        ...createProviderDto,
        user_id: userId,
        country: createProviderDto.country || 'Maroc',
        is_verified: false,
        rating_avg: 0,
        review_count: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findAll(
    query: QueryProviderDto = {},
  ): Promise<{ data: Provider[]; total: number }> {
    let queryBuilder = this.supabase
      .from('providers')
      .select('*, user_profiles(id, full_name, email, avatar_url)', {
        count: 'exact',
      });

    // Apply filters
    if (query.search) {
      queryBuilder = queryBuilder.or(`
        company_name.ilike.%${query.search}%, 
        description.ilike.%${query.search}%, 
        city.ilike.%${query.search}%
      `);
    }

    if (query.city) {
      queryBuilder = queryBuilder.eq('city', query.city);
    }

    if (query.region) {
      queryBuilder = queryBuilder.eq('region', query.region);
    }

    if (query.is_verified !== undefined) {
      queryBuilder = queryBuilder.eq('is_verified', query.is_verified);
    }

    if (query.min_rating) {
      queryBuilder = queryBuilder.gte('rating_avg', query.min_rating);
    }

    // Advanced filters
    if (query.available_date) {
      // Filter providers who have availability on the given date
      const { data: availableProviders } = await this.supabase
        .from('provider_availabilities')
        .select('provider_id')
        .eq('date', query.available_date)
        .eq('is_available', true);

      if (availableProviders && availableProviders.length > 0) {
        const providerIds = availableProviders.map((ap) => ap.provider_id);
        queryBuilder = queryBuilder.in('id', providerIds);
      } else {
        // No providers available on this date
        return { data: [], total: 0 };
      }
    }

    if (query.max_budget) {
      queryBuilder = queryBuilder.lte('min_price', query.max_budget);
    }

    if (query.category) {
      queryBuilder = queryBuilder.contains('categories', [query.category]);
    }

    if (query.min_capacity || query.max_capacity) {
      if (query.min_capacity) {
        queryBuilder = queryBuilder.gte('max_capacity', query.min_capacity);
      }
      if (query.max_capacity) {
        queryBuilder = queryBuilder.lte('max_capacity', query.max_capacity);
      }
    }

    if (query.event_style) {
      queryBuilder = queryBuilder.contains('event_styles', [query.event_style]);
    }

    // Apply pagination
    if (query.limit) {
      queryBuilder = queryBuilder.limit(query.limit);
    }

    if (query.offset) {
      queryBuilder = queryBuilder.range(
        query.offset,
        query.offset + (query.limit || 10) - 1,
      );
    }

    // Apply sorting
    if (query.sort_by === 'rating') {
      queryBuilder = queryBuilder.order('rating_avg', { ascending: false });
    } else if (query.sort_by === 'reviews') {
      queryBuilder = queryBuilder.order('review_count', { ascending: false });
    } else if (query.sort_by === 'newest') {
      queryBuilder = queryBuilder.order('created_at', { ascending: false });
    } else {
      // Default: verified first, then by rating
      queryBuilder = queryBuilder
        .order('is_verified', { ascending: false })
        .order('rating_avg', { ascending: false })
        .order('review_count', { ascending: false });
    }

    const { data, error, count } = await queryBuilder;

    if (error) {
      throw new Error(error.message);
    }

    return {
      data: data || [],
      total: count || 0,
    };
  }

  async getStats(): Promise<{
    total: number;
    verified: number;
    unverified: number;
    avg_rating: number;
    total_services: number;
    monthly_revenue: number;
  }> {
    const now = new Date();
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();

    const [providersRes, servicesRes, revenueRes] = await Promise.all([
      this.supabase.from('providers').select('is_verified, rating_avg'),
      this.supabase
        .from('services')
        .select('id', { count: 'exact', head: true }),
      this.supabase
        .from('bookings')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', monthStart),
    ]);

    if (providersRes.error) throw new Error(providersRes.error.message);

    const providers = providersRes.data || [];
    const verified = providers.filter((p) => p.is_verified).length;
    const avgRating =
      providers.length > 0
        ? providers.reduce((s, p) => s + (p.rating_avg || 0), 0) /
        providers.length
        : 0;
    const monthlyRevenue = (revenueRes.data || []).reduce(
      (s, b) => s + (b.amount || 0),
      0,
    );

    return {
      total: providers.length,
      verified,
      unverified: providers.length - verified,
      avg_rating: Math.round(avgRating * 10) / 10,
      total_services: servicesRes.count || 0,
      monthly_revenue: monthlyRevenue,
    };
  }

  async getProviderStats(userId: string, period: string = 'month') {
    // 1. Fetch provider details to get provider ID
    const provider = await this.findByUserId(userId);
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // 2. Fetch specific stats for this provider
    const now = new Date();
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString();
    } else if (period === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay()); // Start of week
      startDate = d.toISOString();
    }

    // Fetch active bookings 
    const { data: bookings } = await this.supabase
      .from('bookings')
      .select('id, amount, status, created_at')
      .eq('provider_id', provider.id)
      .gte('created_at', startDate);

    const periodBookings = bookings || [];
    const revenue = periodBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    return {
      overview: {
        totalBookings: periodBookings.length,
        completedBookings: periodBookings.filter(b => b.status === 'completed').length,
        totalRevenue: revenue,
        averageRating: provider.rating_avg || 0,
        reviewCount: provider.review_count || 0,
      },
      performance: {
        responseRate: 98, // Mocked for now
        cancellationRate: 2, // Mocked for now
        completionRate: periodBookings.length > 0 ?
          Math.round((periodBookings.filter(b => b.status === 'completed').length / periodBookings.length) * 100) : 100
      },
      trends: {
        // Simplified mock trend data based on the current revenue
        monthlyRevenue: Array.from({ length: 6 }).map((_, i) => ({
          month: new Date(now.getFullYear(), now.getMonth() - (5 - i), 1).toLocaleString('default', { month: 'short' }),
          revenue: i === 5 ? revenue : Math.floor(Math.random() * (revenue + 5000))
        })),
        bookingVolume: Array.from({ length: 6 }).map((_, i) => ({
          month: new Date(now.getFullYear(), now.getMonth() - (5 - i), 1).toLocaleString('default', { month: 'short' }),
          count: i === 5 ? periodBookings.length : Math.floor(Math.random() * (periodBookings.length + 10))
        }))
      }
    };
  }

  async findOne(id: string): Promise<Provider> {
    const { data, error } = await this.supabase
      .from('providers')
      .select(
        `
        *,
        user_profiles(id, full_name, email, avatar_url),
        services(id, title, base_price, rating, is_active)
      `,
      )
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException('Provider not found');
    }

    return data;
  }

  async findByUserId(userId: string): Promise<Provider> {
    const { data, error } = await this.supabase
      .from('providers')
      .select('*, services(id, is_active)')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null as any;
    }

    const services = data.services || [];
    return {
      ...data,
      total_services: services.length,
      active_services: services.filter((s: any) => s.is_active).length,
    };
  }

  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 50,
  ): Promise<Provider[]> {
    // Using PostGIS would be better, but for simplicity we'll use basic distance calculation
    const { data, error } = await this.supabase
      .from('providers')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .eq('is_verified', true);

    if (error) {
      throw new Error(error.message);
    }

    // Filter by distance (simplified calculation)
    const nearbyProviders = (data || []).filter((provider) => {
      if (!provider.latitude || !provider.longitude) return false;

      const distance = this.calculateDistance(
        latitude,
        longitude,
        provider.latitude,
        provider.longitude,
      );

      return distance <= radiusKm;
    });

    return nearbyProviders;
  }

  async findTopRated(limit: number = 10): Promise<Provider[]> {
    const { data, error } = await this.supabase
      .from('providers')
      .select('*')
      .eq('is_verified', true)
      .gte('review_count', 5)
      .order('rating_avg', { ascending: false })
      .order('review_count', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async updateByUserId(
    userId: string,
    updateProviderDto: UpdateProviderDto,
  ): Promise<Provider> {
    const { data: provider } = await this.supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    const { data, error } = await this.supabase
      .from('providers')
      .update(updateProviderDto)
      .eq('id', provider.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(
    id: string,
    userId: string,
    updateProviderDto: UpdateProviderDto,
  ): Promise<Provider> {
    // Check ownership
    const provider = await this.findOne(id);
    if (provider.user_id !== userId) {
      throw new ForbiddenException(
        'You can only update your own provider profile',
      );
    }

    const { data, error } = await this.supabase
      .from('providers')
      .update(updateProviderDto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new NotFoundException('Provider not found');
    }

    return data;
  }

  async updateVerification(id: string, isVerified: boolean): Promise<Provider> {
    const { data, error } = await this.supabase
      .from('providers')
      .update({
        is_verified: isVerified,
        verification_date: isVerified ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new NotFoundException('Provider not found');
    }

    return data;
  }

  async updateRating(providerId: string, newRating: number): Promise<void> {
    // Get current ratings
    const { data: provider } = await this.supabase
      .from('providers')
      .select('rating_avg, review_count')
      .eq('id', providerId)
      .single();

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Calculate new average
    const newReviewCount = provider.review_count + 1;
    const newRatingAvg =
      (provider.rating_avg * provider.review_count + newRating) /
      newReviewCount;

    // Update provider
    const { error } = await this.supabase
      .from('providers')
      .update({
        rating_avg: newRatingAvg,
        review_count: newReviewCount,
      })
      .eq('id', providerId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    // Check ownership
    const provider = await this.findOne(id);
    if (provider.user_id !== userId) {
      throw new ForbiddenException(
        'You can only delete your own provider profile',
      );
    }

    const { error } = await this.supabase
      .from('providers')
      .delete()
      .eq('id', id);

    if (error) {
      throw new NotFoundException('Provider not found');
    }
  }

  // --- Availability Management ---

  async getAvailabilities(
    providerId: string,
    startDate?: string,
    endDate?: string,
  ) {
    let query = this.supabase
      .from('provider_availabilities')
      .select('*')
      .eq('provider_id', providerId);

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query.order('date', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  }

  async addAvailability(
    userId: string,
    providerId: string,
    dto: CreateAvailabilityDto,
  ) {
    // Check ownership
    const provider = await this.findOne(providerId);
    if (provider.user_id !== userId) {
      throw new ForbiddenException(
        'You can only manage availabilities for your own provider profile',
      );
    }

    const { data, error } = await this.supabase
      .from('provider_availabilities')
      .insert({
        provider_id: providerId,
        ...dto,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateAvailability(
    userId: string,
    providerId: string,
    availabilityId: string,
    dto: UpdateAvailabilityDto,
  ) {
    // Check ownership
    const provider = await this.findOne(providerId);
    if (provider.user_id !== userId) {
      throw new ForbiddenException(
        'You can only manage availabilities for your own provider profile',
      );
    }

    const { data, error } = await this.supabase
      .from('provider_availabilities')
      .update(dto)
      .eq('id', availabilityId)
      .eq('provider_id', providerId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async removeAvailability(
    userId: string,
    providerId: string,
    availabilityId: string,
  ) {
    // Check ownership
    const provider = await this.findOne(providerId);
    if (provider.user_id !== userId) {
      throw new ForbiddenException(
        'You can only manage availabilities for your own provider profile',
      );
    }

    const { error } = await this.supabase
      .from('provider_availabilities')
      .delete()
      .eq('id', availabilityId)
      .eq('provider_id', providerId);

    if (error) throw new Error(error.message);
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // --- KYC Document Management ---

  async submitKycDocument(
    userId: string,
    dto: { document_type: string; file_url: string; original_name?: string },
  ) {
    const provider = await this.findByUserId(userId);
    if (!provider) throw new NotFoundException('Provider profile not found');

    const { data, error } = await this.supabase
      .from('provider_kyc_documents')
      .insert({ provider_id: provider.id, ...dto, status: 'pending' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getMyKycDocuments(userId: string) {
    const provider = await this.findByUserId(userId);
    if (!provider) return [];

    const { data, error } = await this.supabase
      .from('provider_kyc_documents')
      .select('*')
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async getProviderKycDocuments(providerId: string) {
    const { data, error } = await this.supabase
      .from('provider_kyc_documents')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async reviewKycDocument(
    docId: string,
    reviewerId: string,
    status: 'approved' | 'rejected',
    notes?: string,
  ) {
    const { data: doc, error: docError } = await this.supabase
      .from('provider_kyc_documents')
      .update({
        status,
        reviewer_id: reviewerId,
        reviewer_notes: notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', docId)
      .select('provider_id')
      .single();

    if (docError) throw new Error(docError.message);

    // If approved, check if all docs for this provider are approved to auto-verify
    if (status === 'approved' && doc) {
      const { data: allDocs } = await this.supabase
        .from('provider_kyc_documents')
        .select('status')
        .eq('provider_id', doc.provider_id);

      const anyPending = (allDocs || []).some((d) => d.status === 'pending');
      if (!anyPending) {
        await this.supabase
          .from('providers')
          .update({
            is_verified: true,
            verification_date: new Date().toISOString(),
          })
          .eq('id', doc.provider_id);
      }
    }

    return { success: true };
  }

  async getAllPendingKycDocuments() {
    const { data, error } = await this.supabase
      .from('provider_kyc_documents')
      .select(
        '*, provider:providers(id, company_name, user_id, user_profiles(full_name, email))',
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }
}
