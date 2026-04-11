import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { Service } from './entities/service.entity';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async create(
    providerId: string,
    createServiceDto: CreateServiceDto,
  ): Promise<Service> {
    // Verify provider exists
    const { data: provider } = await this.supabase
      .from('providers')
      .select('id, user_id')
      .eq('id', providerId)
      .single();

    if (!provider) {
      throw new ForbiddenException('Provider profile not found');
    }

    const { data, error } = await this.supabase
      .from('services')
      .insert({
        ...createServiceDto,
        provider_id: providerId,
        currency: createServiceDto.currency || 'MAD',
        is_active: createServiceDto.is_active ?? true,
        is_featured: createServiceDto.is_featured ?? false,
      })
      .select(
        `
        *,
        providers!inner(
          id,
          company_name,
          user_id,
          rating_avg,
          is_verified
        ),
        categories(
          id,
          name,
          slug
        )
      `,
      )
      .single();

    if (error) {
      this.logger.error(
        `Error creating service for provider ${providerId}: ${JSON.stringify(error)}`,
      );
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async findAll(
    query: QueryServiceDto = {},
  ): Promise<{ data: Service[]; total: number }> {
    const categoryId = query.category_id || query.category;

    let queryBuilder = this.supabase.from('services').select(
      `
        *,
        providers!inner(
          id,
          company_name,
          user_id,
          rating_avg,
          is_verified,
          city,
          region
        ),
        categories!inner(
          id,
          name,
          slug
        )
      `,
      { count: 'exact' },
    );

    // Apply filters
    if (query.search) {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${query.search}%,description.ilike.%${query.search}%,short_description.ilike.%${query.search}%`,
      );
    }

    if (categoryId) {
      // Validate if it's a UUID
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          categoryId,
        );
      if (!isUuid) {
        return { data: [], total: 0 };
      }
      queryBuilder = queryBuilder.eq('category_id', categoryId);
    }
    if (query.provider_id) {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          query.provider_id,
        );
      if (!isUuid) {
        return { data: [], total: 0 };
      }
      queryBuilder = queryBuilder.eq('provider_id', query.provider_id);
    }

    if (query.price_type) {
      queryBuilder = queryBuilder.eq('price_type', query.price_type);
    }

    if (query.min_price) {
      queryBuilder = queryBuilder.gte('base_price', query.min_price);
    }

    if (query.max_price) {
      queryBuilder = queryBuilder.lte('base_price', query.max_price);
    }

    if (query.location_type) {
      queryBuilder = queryBuilder.eq('location_type', query.location_type);
    }

    if (query.is_active !== undefined) {
      queryBuilder = queryBuilder.eq('is_active', query.is_active);
    } else {
      queryBuilder = queryBuilder.eq('is_active', true);
    }

    if (query.is_featured !== undefined) {
      queryBuilder = queryBuilder.eq('is_featured', query.is_featured);
    }

    if (query.max_budget) {
      queryBuilder = queryBuilder.lte('base_price', query.max_budget);
    }

    if (query.min_capacity) {
      queryBuilder = queryBuilder.gte('max_capacity', query.min_capacity);
    }

    if (query.max_capacity) {
      queryBuilder = queryBuilder.lte('min_capacity', query.max_capacity);
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
    const sortBy = query.sort_by || 'created_at';
    const sortOrder = query.sort_order || 'desc';

    switch (sortBy) {
      case 'price':
        queryBuilder = queryBuilder.order('base_price', {
          ascending: sortOrder === 'asc',
        });
        break;
      case 'title':
        queryBuilder = queryBuilder.order('title', {
          ascending: sortOrder === 'asc',
        });
        break;
      default:
        queryBuilder = queryBuilder.order('created_at', {
          ascending: sortOrder === 'asc',
        });
    }

    const { data, error, count } = await queryBuilder;

    if (error) {
      throw new BadRequestException(error.message);
    }

    let services = data || [];

    if (query.city) {
      services = services.filter(
        (service) => service.providers?.city === query.city,
      );
    }

    if (query.min_rating) {
      const minRating = query.min_rating;
      services = services.filter(
        (service) => Number(service.providers?.rating_avg || 0) >= minRating,
      );
    }

    if (query.event_style) {
      services = services.filter((service) => {
        const eventStyles = (service.providers as any)?.event_styles;
        return Array.isArray(eventStyles)
          ? eventStyles.includes(query.event_style)
          : true;
      });
    }

    if (sortBy === 'rating') {
      services = [...services].sort((a, b) => {
        const aRating = Number(a.providers?.rating_avg || 0);
        const bRating = Number(b.providers?.rating_avg || 0);
        return sortOrder === 'asc' ? aRating - bRating : bRating - aRating;
      });
    }

    if (sortBy === 'review_count') {
      services = [...services].sort((a, b) => {
        const aCount = Number((a.providers as any)?.review_count || 0);
        const bCount = Number((b.providers as any)?.review_count || 0);
        return sortOrder === 'asc' ? aCount - bCount : bCount - aCount;
      });
    }

    return {
      data: services,
      total: services.length || count || 0,
    };
  }

  async findOne(id: string): Promise<Service> {
    const { data, error } = await this.supabase
      .from('services')
      .select(
        `
        *,
        providers!inner(
          id,
          company_name,
          user_id,
          rating_avg,
          is_verified,
          city,
          region,
          address,
          website
        ),
        categories!inner(
          id,
          name,
          slug,
          description
        )
      `,
      )
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException('Service not found');
    }

    return data;
  }

  async createByUserId(
    userId: string,
    createServiceDto: CreateServiceDto,
  ): Promise<Service> {
    // Find provider by user_id
    let { data: provider } = await this.supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .single();

    // Auto-create provider profile if user has provider role but no profile yet
    if (!provider) {
      const { data: user } = await this.supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      const { data: newProvider, error: createErr } = await this.supabase
        .from('providers')
        .insert({
          user_id: userId,
          company_name: user?.full_name || 'My Company',
        })
        .select('id')
        .single();

      if (createErr || !newProvider) {
        this.logger.error(`Failed to auto-create provider profile: ${createErr?.message}`);
        throw new ForbiddenException(
          'You must have a provider profile to create services',
        );
      }

      provider = newProvider;
    }

    return this.create(provider.id, createServiceDto);
  }

  async findByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<{ data: Service[]; total: number }> {
    // First find the provider for this user
    const { data: provider } = await this.supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!provider) {
      return { data: [], total: 0 };
    }

    let q = this.supabase
      .from('services')
      .select(
        `
        *,
        categories(
          id,
          name,
          slug
        )
      `,
        { count: 'exact' },
      )
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false });

    if (limit !== undefined && offset !== undefined) {
      q = q.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await q;

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      data: (data || []).map((s) => ({ ...s, is_active: s.is_active ?? true })),
      total: count || 0,
    };
  }

  async findByProvider(
    providerId: string,
    userId: string,
  ): Promise<{ data: Service[]; total: number }> {
    // Verify user owns the provider
    const { data: provider } = await this.supabase
      .from('providers')
      .select('id, user_id')
      .eq('id', providerId)
      .eq('user_id', userId)
      .single();

    if (!provider) {
      throw new ForbiddenException(
        'You can only view services for your own provider profile',
      );
    }

    const { data, error, count } = await this.supabase
      .from('services')
      .select(
        `
        *,
        categories!inner(
          id,
          name,
          slug
        )
      `,
        { count: 'exact' },
      )
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      data: data || [],
      total: count || 0,
    };
  }

  async findByCategory(
    categoryId: string,
    limit: number = 10,
  ): Promise<Service[]> {
    const { data, error } = await this.supabase
      .from('services')
      .select(
        `
        *,
        providers!inner(
          id,
          company_name,
          rating_avg,
          is_verified,
          city
        ),
        categories!inner(
          id,
          name,
          slug
        )
      `,
      )
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('providers.rating_avg', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data || [];
  }

  async findFeatured(limit: number = 10): Promise<Service[]> {
    // First try to get featured services
    const { data: featured, error: featuredError } = await this.supabase
      .from('services')
      .select(
        `
        *,
        providers(
          id,
          company_name,
          rating_avg,
          is_verified,
          city
        ),
        categories(
          id,
          name,
          slug
        )
      `,
      )
      .eq('is_featured', true)
      .eq('is_active', true)
      .or('featured_until.is.null,featured_until.gt.now()')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (featuredError) {
      this.logger.warn(`Error fetching featured services: ${featuredError.message}`);
    }

    // If we have featured services, return them
    if (featured && featured.length > 0) {
      return featured;
    }

    // Fallback: return the latest active services so the home page is never empty
    const { data: latest, error: latestError } = await this.supabase
      .from('services')
      .select(
        `
        *,
        providers(
          id,
          company_name,
          rating_avg,
          is_verified,
          city
        ),
        categories(
          id,
          name,
          slug
        )
      `,
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (latestError) {
      throw new BadRequestException(latestError.message);
    }

    return latest || [];
  }

  async update(
    id: string,
    userId: string,
    updateServiceDto: UpdateServiceDto,
  ): Promise<Service> {
    // Get service to verify ownership
    const { data: service } = await this.supabase
      .from('services')
      .select(
        `
        provider_id,
        providers!inner(
          user_id
        )
      `,
      )
      .eq('id', id)
      .single();

    const providerData = service?.providers as unknown as
      | { user_id: string }
      | undefined;
    if (!service || providerData?.user_id !== userId) {
      throw new ForbiddenException('You can only update your own services');
    }

    const { data, error } = await this.supabase
      .from('services')
      .update(updateServiceDto)
      .eq('id', id)
      .select(
        `
        *,
        providers!inner(
          id,
          company_name,
          user_id,
          rating_avg,
          is_verified
        ),
        categories!inner(
          id,
          name,
          slug
        )
      `,
      )
      .single();

    if (error) {
      throw new NotFoundException('Service not found');
    }

    return data;
  }

  async updateFeatured(
    id: string,
    isFeatured: boolean,
    featuredUntil?: Date,
  ): Promise<Service> {
    const { data, error } = await this.supabase
      .from('services')
      .update({
        is_featured: isFeatured,
        featured_until:
          isFeatured && featuredUntil ? featuredUntil.toISOString() : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new NotFoundException('Service not found');
    }

    return data;
  }

  async remove(id: string, userId: string): Promise<void> {
    // Get service to verify ownership
    const { data: service } = await this.supabase
      .from('services')
      .select(
        `
        provider_id,
        providers!inner(
          user_id
        )
      `,
      )
      .eq('id', id)
      .single();

    const providerData = service?.providers as unknown as
      | { user_id: string }
      | undefined;
    if (!service || providerData?.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own services');
    }

    const { error } = await this.supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      throw new NotFoundException('Service not found');
    }
  }
}
