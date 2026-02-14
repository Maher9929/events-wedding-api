import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventDto } from './dto/query-event.dto';
import { Event } from './entities/event.entity';

@Injectable()
export class EventsService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async create(clientId: string, createEventDto: CreateEventDto): Promise<Event> {
    const { data, error } = await this.supabase
      .from('events')
      .insert({
        ...createEventDto,
        client_id: clientId,
        currency: createEventDto.currency || 'MAD',
        status: createEventDto.status || 'planning',
        visibility: createEventDto.visibility || 'private',
        is_template: createEventDto.is_template || false,
      })
      .select(`
        *,
        user_profiles!inner(
          id,
          email,
          full_name
        )
      `)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findAll(query: QueryEventDto = {}): Promise<{ data: Event[]; total: number }> {
    let queryBuilder = this.supabase
      .from('events')
      .select(`
        *,
        user_profiles!inner(
          id,
          email,
          full_name
        )
      `, { count: 'exact' });

    // Apply filters
    if (query.search) {
      queryBuilder = queryBuilder.or(`
        title.ilike.%${query.search}%, 
        description.ilike.%${query.search}%, 
        venue_name.ilike.%${query.search}%
      `);
    }

    if (query.event_type) {
      queryBuilder = queryBuilder.eq('event_type', query.event_type);
    }

    if (query.client_id) {
      queryBuilder = queryBuilder.eq('client_id', query.client_id);
    }

    if (query.venue_city) {
      queryBuilder = queryBuilder.eq('venue_city', query.venue_city);
    }

    if (query.venue_region) {
      queryBuilder = queryBuilder.eq('venue_region', query.venue_region);
    }

    if (query.status) {
      queryBuilder = queryBuilder.eq('status', query.status);
    }

    if (query.visibility) {
      queryBuilder = queryBuilder.eq('visibility', query.visibility);
    }

    if (query.is_template !== undefined) {
      queryBuilder = queryBuilder.eq('is_template', query.is_template);
    }

    if (query.date_from) {
      queryBuilder = queryBuilder.gte('event_date', query.date_from);
    }

    if (query.date_to) {
      queryBuilder = queryBuilder.lte('event_date', query.date_to);
    }

    if (query.min_budget) {
      queryBuilder = queryBuilder.gte('budget', query.min_budget);
    }

    if (query.max_budget) {
      queryBuilder = queryBuilder.lte('budget', query.max_budget);
    }

    // Apply pagination
    if (query.limit) {
      queryBuilder = queryBuilder.limit(query.limit);
    }

    if (query.offset) {
      queryBuilder = queryBuilder.range(query.offset, query.offset + (query.limit || 10) - 1);
    }

    // Apply sorting
    const sortBy = query.sort_by || 'event_date';
    const sortOrder = query.sort_order || 'asc';

    switch (sortBy) {
      case 'event_date':
        queryBuilder = queryBuilder.order('event_date', { ascending: sortOrder === 'asc' });
        break;
      case 'title':
        queryBuilder = queryBuilder.order('title', { ascending: sortOrder === 'asc' });
        break;
      case 'budget':
        queryBuilder = queryBuilder.order('budget', { ascending: sortOrder === 'asc' });
        break;
      case 'guest_count':
        queryBuilder = queryBuilder.order('guest_count', { ascending: sortOrder === 'asc' });
        break;
      default:
        queryBuilder = queryBuilder.order('created_at', { ascending: sortOrder === 'asc' });
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

  async findOne(id: string): Promise<Event> {
    const { data, error } = await this.supabase
      .from('events')
      .select(`
        *,
        user_profiles!inner(
          id,
          email,
          full_name,
          phone
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException('Event not found');
    }

    return data;
  }

  async findByClient(clientId: string, userId: string): Promise<{ data: Event[]; total: number }> {
    // Verify user owns the client profile
    const { data: client } = await this.supabase
      .from('user_profiles')
      .select('id, email')
      .eq('id', clientId)
      .eq('id', userId)
      .single();

    if (!client) {
      throw new ForbiddenException('You can only view events for your own profile');
    }

    const { data, error, count } = await this.supabase
      .from('events')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .order('event_date', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return {
      data: data || [],
      total: count || 0,
    };
  }

  async findUpcoming(limit: number = 10): Promise<Event[]> {
    const { data, error } = await this.supabase
      .from('events')
      .select(`
        *,
        user_profiles!inner(
          id,
          full_name
        )
      `)
      .eq('visibility', 'public')
      .in('status', ['planning', 'confirmed'])
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async findByEventType(eventType: string, limit: number = 10): Promise<Event[]> {
    const { data, error } = await this.supabase
      .from('events')
      .select(`
        *,
        user_profiles!inner(
          id,
          full_name
        )
      `)
      .eq('event_type', eventType)
      .eq('visibility', 'public')
      .order('event_date', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async findTemplates(limit: number = 10): Promise<Event[]> {
    const { data, error } = await this.supabase
      .from('events')
      .select(`
        *,
        user_profiles!inner(
          id,
          full_name
        )
      `)
      .eq('is_template', true)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async update(id: string, userId: string, updateEventDto: UpdateEventDto): Promise<Event> {
    // Verify ownership
    const event = await this.findOne(id);
    if (event.client_id !== userId) {
      throw new ForbiddenException('You can only update your own events');
    }

    const { data, error } = await this.supabase
      .from('events')
      .update(updateEventDto)
      .eq('id', id)
      .select(`
        *,
        user_profiles!inner(
          id,
          email,
          full_name
        )
      `)
      .single();

    if (error) {
      throw new NotFoundException('Event not found');
    }

    return data;
  }

  async updateStatus(id: string, status: 'planning' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'): Promise<Event> {
    const { data, error } = await this.supabase
      .from('events')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new NotFoundException('Event not found');
    }

    return data;
  }

  async remove(id: string, userId: string): Promise<void> {
    // Verify ownership
    const event = await this.findOne(id);
    if (event.client_id !== userId) {
      throw new ForbiddenException('You can only delete your own events');
    }

    const { error } = await this.supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      throw new NotFoundException('Event not found');
    }
  }
}
