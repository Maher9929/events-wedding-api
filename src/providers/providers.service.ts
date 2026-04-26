import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { filterContactInfo } from '../common/content-filter';
import { sanitizeSearch } from '../common/sanitize';
import { maskProviderData } from '../common/data-masking';
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
  ) {}

  private getPeriodRange(period: string = 'month'): {
    startDate: string;
    buckets: number;
    label: (date: Date) => string;
    bucketStart: (index: number, now: Date) => Date;
  } {
    const now = new Date();

    if (period === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return {
        startDate: start.toISOString(),
        buckets: 7,
        label: (date) => date.toLocaleDateString('en-US', { weekday: 'short' }),
        bucketStart: (index, ref) => {
          const d = new Date(ref);
          d.setDate(ref.getDate() - (6 - index));
          d.setHours(0, 0, 0, 0);
          return d;
        },
      };
    }

    if (period === 'year') {
      const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      return {
        startDate: start.toISOString(),
        buckets: 12,
        label: (date) => date.toLocaleDateString('en-US', { month: 'short' }),
        bucketStart: (index, ref) =>
          new Date(ref.getFullYear(), ref.getMonth() - (11 - index), 1),
      };
    }

    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: start.toISOString(),
      buckets: 6,
      label: (date) => date.toLocaleDateString('en-US', { month: 'short' }),
      bucketStart: (index, ref) =>
        new Date(ref.getFullYear(), ref.getMonth() - (5 - index), 1),
    };
  }

  private buildRevenueTrend(
    rows: Array<{ created_at: string; amount?: number | null }>,
    period: string,
  ) {
    const now = new Date();
    const config = this.getPeriodRange(period);

    return Array.from({ length: config.buckets }).map((_, index) => {
      const bucketDate = config.bucketStart(index, now);
      const revenue = rows
        .filter((row) => {
          const createdAt = new Date(row.created_at);
          if (period === 'week') {
            return createdAt.toDateString() === bucketDate.toDateString();
          }
          return (
            createdAt.getMonth() === bucketDate.getMonth() &&
            createdAt.getFullYear() === bucketDate.getFullYear()
          );
        })
        .reduce((sum, row) => sum + Number(row.amount || 0), 0);

      return {
        month: config.label(bucketDate),
        revenue: Math.round(revenue * 100) / 100,
      };
    });
  }

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
      throw new BadRequestException(error.message);
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
      const term = sanitizeSearch(query.search);
      queryBuilder = queryBuilder.or(
        `company_name.ilike.%${term}%,description.ilike.%${term}%,city.ilike.%${term}%`,
      );
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
      // provider_availabilities is used as a blocking calendar in this project
      const { data: blockedProviders } = await this.supabase
        .from('provider_availabilities')
        .select('provider_id')
        .eq('date', query.available_date)
        .eq('is_blocked', true);

      if (blockedProviders && blockedProviders.length > 0) {
        const blockedIds = blockedProviders.map((ap) => ap.provider_id);
        queryBuilder = queryBuilder.not(
          'id',
          'in',
          `(${blockedIds.join(',')})`,
        );
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
      throw new BadRequestException(error.message);
    }

    return {
      data: (data || []).map((p) =>
        maskProviderData(p as unknown as Record<string, any>),
      ) as Provider[],
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
    total_users: number;
    active_bookings: number;
    pending_commissions: number;
    total_reviews: number;
  }> {
    const now = new Date();
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();

    const [
      providersRes,
      servicesRes,
      revenueRes,
      activeBookingsRes,
      commissionsRes,
      reviewsRes,
    ] = await Promise.all([
      this.supabase.from('providers').select('is_verified, rating_avg'),
      this.supabase
        .from('services')
        .select('id', { count: 'exact', head: true }),
      this.supabase
        .from('bookings')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', monthStart),
      this.supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'confirmed']),
      this.supabase
        .from('commissions')
        .select('commission_amount')
        .eq('status', 'pending'),
      this.supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true }),
    ]);

    if (providersRes.error)
      throw new BadRequestException(providersRes.error.message);

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
      total_users:
        (
          await this.supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
        ).count || 0,
      active_bookings: activeBookingsRes.count || 0,
      pending_commissions: (commissionsRes.data || []).reduce(
        (sum, item) => sum + Number(item.commission_amount || 0),
        0,
      ),
      total_reviews: reviewsRes.count || 0,
    };
  }

  async getProviderStats(userId: string, period: string = 'month') {
    const provider = await this.findByUserId(userId);
    const { startDate } = this.getPeriodRange(period);

    if (!provider) {
      return {
        overview: {
          totalBookings: 0,
          confirmedBookings: 0,
          completedBookings: 0,
          totalRevenue: 0,
          averageRating: 0,
          totalServices: 0,
          featuredServices: 0,
          pendingQuotes: 0,
          acceptedQuotes: 0,
          quoteAcceptanceRate: 0,
          repeatClients: 0,
          upcomingBookings: 0,
          cancellationRate: 0,
        },
        trends: {
          monthlyRevenue: [],
          bookingStatusDistribution: {
            pending: 0,
            confirmed: 0,
            cancelled: 0,
            completed: 0,
            rejected: 0,
          },
        },
        recentActivity: [],
        period,
      };
    }

    const [
      bookingsRes,
      quotesRes,
      totalServicesRes,
      featuredServicesRes,
      recentActivityRes,
    ] = await Promise.all([
      this.supabase
        .from('bookings')
        .select(
          'id, client_id, amount, status, payment_status, created_at, booking_date',
        )
        .eq('provider_id', provider.id)
        .gte('created_at', startDate),
      this.supabase
        .from('quotes')
        .select('status, created_at, total_amount')
        .eq('provider_id', userId)
        .gte('created_at', startDate),
      this.supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', provider.id),
      this.supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', provider.id)
        .eq('is_featured', true),
      this.supabase
        .from('bookings')
        .select('id, client_id, amount, status, payment_status, created_at')
        .eq('provider_id', provider.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const periodBookings = bookingsRes.data || [];
    const periodQuotes = quotesRes.data || [];
    const revenueRows = periodBookings.filter(
      (b) => b.status === 'completed' || b.payment_status === 'fully_paid',
    );
    const revenue = revenueRows.reduce(
      (sum, b) => sum + Number(b.amount || 0),
      0,
    );

    const recentBookings = recentActivityRes.data || [];
    const recentClientIds = [
      ...new Set(
        recentBookings.map((booking) => booking.client_id).filter(Boolean),
      ),
    ];
    const { data: recentClients } = recentClientIds.length
      ? await this.supabase
          .from('user_profiles')
          .select('id, full_name, avatar_url')
          .in('id', recentClientIds)
      : { data: [] as any[] };

    const clientMap = new Map(
      (recentClients || []).map((client) => [client.id, client]),
    );
    const recentActivity = recentBookings.map((booking) => ({
      ...booking,
      client: clientMap.get(booking.client_id) || null,
    }));

    const pendingQuotes = periodQuotes.filter(
      (q) => q.status === 'draft' || q.status === 'sent',
    ).length;
    const acceptedQuotes = periodQuotes.filter(
      (q) => q.status === 'accepted',
    ).length;
    const actionableQuotes = periodQuotes.filter((q) =>
      ['sent', 'accepted', 'rejected'].includes(q.status),
    ).length;
    const bookingClientIds = periodBookings
      .map((booking) => booking.client_id)
      .filter(Boolean);
    const repeatClients = new Set(
      bookingClientIds.filter(
        (clientId, index) => bookingClientIds.indexOf(clientId) !== index,
      ),
    ).size;
    const upcomingBookings = periodBookings.filter(
      (booking) =>
        ['pending', 'confirmed'].includes(booking.status) &&
        new Date(booking.booking_date).getTime() >= Date.now(),
    ).length;
    const cancellationRate =
      periodBookings.length > 0
        ? Math.round(
            (periodBookings.filter((b) => b.status === 'cancelled').length /
              periodBookings.length) *
              1000,
          ) / 10
        : 0;

    return {
      overview: {
        totalBookings: periodBookings.length,
        confirmedBookings: periodBookings.filter(
          (b) => b.status === 'confirmed',
        ).length,
        completedBookings: periodBookings.filter(
          (b) => b.status === 'completed',
        ).length,
        totalRevenue: revenue,
        averageRating: provider.rating_avg || 0,
        totalServices: totalServicesRes.count || 0,
        featuredServices: featuredServicesRes.count || 0,
        pendingQuotes,
        acceptedQuotes,
        quoteAcceptanceRate:
          actionableQuotes > 0
            ? Math.round((acceptedQuotes / actionableQuotes) * 1000) / 10
            : 0,
        repeatClients,
        upcomingBookings,
        cancellationRate,
      },
      trends: {
        monthlyRevenue: this.buildRevenueTrend(revenueRows, period),
        bookingStatusDistribution: {
          pending: periodBookings.filter((b) => b.status === 'pending').length,
          confirmed: periodBookings.filter((b) => b.status === 'confirmed')
            .length,
          cancelled: periodBookings.filter((b) => b.status === 'cancelled')
            .length,
          completed: periodBookings.filter((b) => b.status === 'completed')
            .length,
          rejected: periodBookings.filter((b) => b.status === 'rejected')
            .length,
        },
      },
      recentActivity: recentActivity || [],
      period,
    };
  }

  async getPerformanceMetrics(userId: string) {
    const provider = await this.findByUserId(userId);
    if (!provider) {
      return {
        conversionRates: { quoteConversionRate: 0, bookingConversionRate: 0 },
        performance: {
          averageResponseTime: 0,
          totalEarnings: 0,
          clientSatisfaction: 0,
          averageBookingValue: 0,
        },
        growth: { newClients: 0, repeatClients: 0 },
      };
    }

    const [bookingsRes, quotesRes] = await Promise.all([
      this.supabase
        .from('bookings')
        .select('amount, status, client_id')
        .eq('provider_id', provider.id),
      this.supabase
        .from('quotes')
        .select('status, client_id')
        .eq('provider_id', userId),
    ]);

    const allBookings = bookingsRes.data || [];
    const allQuotes = quotesRes.data || [];
    const totalEarnings = allBookings
      .filter((b) => b.status === 'completed' || b.status === 'confirmed')
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    const bookingClientIds = allBookings
      .map((b) => b.client_id)
      .filter(Boolean);
    const clientIds = new Set(bookingClientIds);
    const repeatClients = [...clientIds].filter(
      (clientId) => bookingClientIds.filter((id) => id === clientId).length > 1,
    ).length;
    const acceptedQuotes = allQuotes.filter(
      (q) => q.status === 'accepted',
    ).length;
    const actionableQuotes = allQuotes.filter((q) =>
      ['sent', 'accepted', 'rejected'].includes(q.status),
    ).length;
    const convertedBookings = allBookings.filter((b) =>
      ['confirmed', 'completed'].includes(b.status),
    ).length;
    const averageBookingValue =
      allBookings.length > 0
        ? Math.round(
            (allBookings.reduce(
              (sum, booking) => sum + Number(booking.amount || 0),
              0,
            ) /
              allBookings.length) *
              100,
          ) / 100
        : 0;

    return {
      conversionRates: {
        quoteConversionRate:
          actionableQuotes > 0
            ? Math.round((acceptedQuotes / actionableQuotes) * 1000) / 10
            : 0,
        bookingConversionRate:
          allBookings.length > 0
            ? Math.round((convertedBookings / allBookings.length) * 1000) / 10
            : 0,
      },
      performance: {
        averageResponseTime: provider.response_time_hours || 2,
        totalEarnings,
        clientSatisfaction:
          Math.round((provider.rating_avg || 0) * 20 * 10) / 10,
        averageBookingValue,
      },
      growth: {
        newClients: clientIds.size,
        repeatClients,
      },
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

  async findOnePublic(id: string): Promise<Record<string, any>> {
    const data = await this.findOne(id);
    return maskProviderData(data as unknown as Record<string, any>);
  }

  async findByUserId(userId: string): Promise<Provider | null> {
    const { data, error } = await this.supabase
      .from('providers')
      .select('*, services(id, is_active)')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    const services = (data.services || []) as {
      id: string;
      is_active: boolean;
    }[];
    return {
      ...data,
      total_services: services.length,
      active_services: services.filter((s) => s.is_active).length,
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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

    if (error) throw new BadRequestException(error.message);
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

    // Sanitize text fields to prevent contact info leakage
    const sanitizedDto = { ...updateProviderDto };
    if (sanitizedDto.company_name)
      sanitizedDto.company_name = filterContactInfo(
        sanitizedDto.company_name,
      ).content;
    if (sanitizedDto.description)
      sanitizedDto.description = filterContactInfo(
        sanitizedDto.description,
      ).content;

    const { data, error } = await this.supabase
      .from('providers')
      .update(sanitizedDto)
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
      throw new BadRequestException(error.message);
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

    if (error) throw new BadRequestException(error.message);
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

    if (error) throw new BadRequestException(error.message);
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

    if (error) throw new BadRequestException(error.message);
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

    if (error) throw new BadRequestException(error.message);
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

    if (error) throw new BadRequestException(error.message);
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

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getProviderKycDocuments(providerId: string) {
    const { data, error } = await this.supabase
      .from('provider_kyc_documents')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
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

    if (docError) throw new BadRequestException(docError.message);

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

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }
}
