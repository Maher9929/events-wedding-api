import { Injectable, NotFoundException, ConflictException, ForbiddenException, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { QueryProviderDto } from './dto/query-provider.dto';
import { Provider } from './entities/provider.entity';

@Injectable()
export class ProvidersService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async create(userId: string, createProviderDto: CreateProviderDto): Promise<Provider> {
    // Check if provider already exists for this user
    const { data: existing } = await this.supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      throw new ConflictException('Provider profile already exists for this user');
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

  async findAll(query: QueryProviderDto = {}): Promise<{ data: Provider[]; total: number }> {
    let queryBuilder = this.supabase
      .from('providers')
      .select('*', { count: 'exact' });

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

    // Apply pagination
    if (query.limit) {
      queryBuilder = queryBuilder.limit(query.limit);
    }

    if (query.offset) {
      queryBuilder = queryBuilder.range(query.offset, query.offset + (query.limit || 10) - 1);
    }

    // Order by rating and verification status
    queryBuilder = queryBuilder
      .order('is_verified', { ascending: false })
      .order('rating_avg', { ascending: false })
      .order('review_count', { ascending: false });

    const { data, error, count } = await queryBuilder;

    if (error) {
      throw new Error(error.message);
    }

    return {
      data: data || [],
      total: count || 0,
    };
  }

  async findOne(id: string): Promise<Provider> {
    const { data, error } = await this.supabase
      .from('providers')
      .select('*')
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
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      throw new NotFoundException('Provider profile not found');
    }

    return data;
  }

  async findNearby(latitude: number, longitude: number, radiusKm: number = 50): Promise<Provider[]> {
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
    const nearbyProviders = (data || []).filter(provider => {
      if (!provider.latitude || !provider.longitude) return false;
      
      const distance = this.calculateDistance(
        latitude, longitude,
        provider.latitude, provider.longitude
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

  async update(id: string, userId: string, updateProviderDto: UpdateProviderDto): Promise<Provider> {
    // Check ownership
    const provider = await this.findOne(id);
    if (provider.user_id !== userId) {
      throw new ForbiddenException('You can only update your own provider profile');
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
    const newRatingAvg = ((provider.rating_avg * provider.review_count) + newRating) / newReviewCount;

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
      throw new ForbiddenException('You can only delete your own provider profile');
    }

    const { error } = await this.supabase
      .from('providers')
      .delete()
      .eq('id', id);

    if (error) {
      throw new NotFoundException('Provider not found');
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}
