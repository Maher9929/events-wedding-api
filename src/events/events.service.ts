import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventDto } from './dto/query-event.dto';
import { Event } from './entities/event.entity';
import { EventBudget } from './entities/event-budget.entity';
import { EventTask } from './entities/event-task.entity';
import { EventTimelineItem } from './entities/event-timeline-item.entity';
import {
  CreateBudgetDto,
  UpdateBudgetDto,
  CreateTaskDto,
  UpdateTaskDto,
  CreateTimelineItemDto,
  UpdateTimelineItemDto,
} from './dto/event-features.dto';
import { CreateGuestDto, UpdateGuestDto } from './dto/event-guests.dto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async create(
    clientId: string,
    createEventDto: CreateEventDto,
  ): Promise<Event> {
    const { data, error } = await this.supabase
      .from('events')
      .insert({
        ...createEventDto,
        client_id: clientId,
        currency: createEventDto.currency || 'QAR',
        status: createEventDto.status || 'planning',
        visibility: createEventDto.visibility || 'private',
        is_template: createEventDto.is_template || false,
      })
      .select('*')
      .single();

    if (error) {
      this.logger.error(`Error creating event: ${JSON.stringify(error)}`);
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async findAll(
    query: QueryEventDto = {},
  ): Promise<{ data: Event[]; total: number }> {
    let queryBuilder = this.supabase.from('events').select(
      `
        *,
        user_profiles(
          id,
          email,
          full_name
        )
      `,
      { count: 'exact' },
    );

    // Apply filters
    if (query.search) {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${query.search}%,description.ilike.%${query.search}%`,
      );
    }

    if (query.event_type) {
      queryBuilder = queryBuilder.eq('event_type', query.event_type);
    }

    if (query.client_id) {
      queryBuilder = queryBuilder.eq('client_id', query.client_id);
    }

    if (query.status) {
      queryBuilder = queryBuilder.eq('status', query.status);
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
      queryBuilder = queryBuilder.range(
        query.offset,
        query.offset + (query.limit || 10) - 1,
      );
    }

    // Apply sorting
    const sortBy = query.sort_by || 'event_date';
    const sortOrder = query.sort_order || 'asc';

    switch (sortBy) {
      case 'event_date':
        queryBuilder = queryBuilder.order('event_date', {
          ascending: sortOrder === 'asc',
        });
        break;
      case 'title':
        queryBuilder = queryBuilder.order('title', {
          ascending: sortOrder === 'asc',
        });
        break;
      case 'budget':
        queryBuilder = queryBuilder.order('budget', {
          ascending: sortOrder === 'asc',
        });
        break;
      case 'guest_count':
        queryBuilder = queryBuilder.order('guest_count', {
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
      .select(
        `
        *,
        user_profiles(
          id,
          email,
          full_name,
          phone
        )
      `,
      )
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException('Event not found');
    }

    return data;
  }

  async findByClient(
    clientId: string,
    status?: string,
    sortOrder?: string,
    limit?: number,
    offset?: number,
    eventType?: string,
  ): Promise<{ data: Event[]; total: number }> {
    let q = this.supabase
      .from('events')
      .select(
        `
        *,
        event_budgets(id, estimated_cost, category, item_name),
        event_tasks(id, title, is_completed)
      `,
        { count: 'exact' },
      )
      .eq('client_id', clientId);

    if (status && status !== 'all') {
      q = q.eq('status', status);
    }

    if (eventType && eventType !== 'all') {
      q = q.eq('event_type', eventType);
    }

    q = q.order('event_date', { ascending: sortOrder !== 'desc' });

    if (limit !== undefined && offset !== undefined) {
      q = q.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await q;

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
    by_type: Record<string, number>;
    by_status: Record<string, number>;
  }> {
    const { data, error } = await this.supabase
      .from('events')
      .select('event_type, status');

    if (error) throw new Error(error.message);

    const events = data || [];
    const by_type: Record<string, number> = {};
    const by_status: Record<string, number> = {};

    events.forEach((e) => {
      by_type[e.event_type] = (by_type[e.event_type] || 0) + 1;
      by_status[e.status] = (by_status[e.status] || 0) + 1;
    });

    return { total: events.length, by_type, by_status };
  }

  async findUpcoming(limit: number = 10): Promise<Event[]> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .in('status', ['planning', 'confirmed'])
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async findByEventType(
    eventType: string,
    limit: number = 10,
  ): Promise<Event[]> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('event_type', eventType)
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
      .select('*')
      .eq('is_template', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async update(
    id: string,
    userId: string,
    updateEventDto: UpdateEventDto,
  ): Promise<Event> {
    // Verify ownership
    const event = await this.findOne(id);
    if (event.client_id !== userId) {
      throw new ForbiddenException('You can only update your own events');
    }

    const { data, error } = await this.supabase
      .from('events')
      .update(updateEventDto)
      .eq('id', id)
      .select(
        `
        *,
        user_profiles(
          id,
          email,
          full_name
        )
      `,
      )
      .single();

    if (error) {
      throw new NotFoundException('Event not found');
    }

    return data;
  }

  async updateStatus(
    id: string,
    status:
      | 'planning'
      | 'confirmed'
      | 'in_progress'
      | 'completed'
      | 'cancelled',
  ): Promise<Event> {
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

    const { error } = await this.supabase.from('events').delete().eq('id', id);

    if (error) {
      throw new NotFoundException('Event not found');
    }
  }

  // Budget Features
  async getBudget(eventId: string): Promise<EventBudget[]> {
    const { data, error } = await this.supabase
      .from('event_budgets')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async addBudgetItem(
    eventId: string,
    dto: CreateBudgetDto,
  ): Promise<EventBudget> {
    const { data, error } = await this.supabase
      .from('event_budgets')
      .insert({ ...dto, event_id: eventId })
      .select()
      .single();

    if (error) {
      this.logger.error(
        `Error adding budget item to event ${eventId}: ${JSON.stringify(error)}`,
      );
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async updateBudgetItem(
    id: string,
    dto: UpdateBudgetDto,
  ): Promise<EventBudget> {
    const { data, error } = await this.supabase
      .from('event_budgets')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async removeBudgetItem(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('event_budgets')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  // Checklist Features
  async getTasks(eventId: string): Promise<EventTask[]> {
    const { data, error } = await this.supabase
      .from('event_tasks')
      .select('*')
      .eq('event_id', eventId)
      .order('due_date', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async addTask(eventId: string, dto: CreateTaskDto): Promise<EventTask> {
    const { data, error } = await this.supabase
      .from('event_tasks')
      .insert({ ...dto, event_id: eventId })
      .select()
      .single();

    if (error) {
      this.logger.error(
        `Error adding task to event ${eventId}: ${JSON.stringify(error)}`,
      );
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async updateTask(id: string, dto: UpdateTaskDto): Promise<EventTask> {
    const { data, error } = await this.supabase
      .from('event_tasks')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async removeTask(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('event_tasks')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  // Timeline Features
  async getTimeline(eventId: string): Promise<EventTimelineItem[]> {
    const { data, error } = await this.supabase
      .from('event_timeline_items')
      .select('*')
      .eq('event_id', eventId)
      .order('start_time', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async addTimelineItem(
    eventId: string,
    dto: CreateTimelineItemDto,
  ): Promise<EventTimelineItem> {
    const { data, error } = await this.supabase
      .from('event_timeline_items')
      .insert({ ...dto, event_id: eventId })
      .select()
      .single();

    if (error) {
      this.logger.error(
        `Error adding timeline item to event ${eventId}: ${JSON.stringify(error)}`,
      );
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async updateTimelineItem(
    id: string,
    dto: UpdateTimelineItemDto,
  ): Promise<EventTimelineItem> {
    const { data, error } = await this.supabase
      .from('event_timeline_items')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async removeTimelineItem(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('event_timeline_items')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  // ─── Guest Management ─────────────────────────────────────────────────────

  async getGuests(eventId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('event_guests')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async addGuest(eventId: string, dto: CreateGuestDto): Promise<any> {
    const { data, error } = await this.supabase
      .from('event_guests')
      .insert({ ...dto, event_id: eventId })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateGuest(id: string, dto: UpdateGuestDto): Promise<any> {
    const { data, error } = await this.supabase
      .from('event_guests')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async removeGuest(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('event_guests')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async getGuestStats(eventId: string): Promise<{
    total: number;
    invited: number;
    confirmed: number;
    declined: number;
  }> {
    const guests = await this.getGuests(eventId);
    return {
      total: guests.length,
      invited: guests.filter((g) => g.status === 'invited').length,
      confirmed: guests.filter((g) => g.status === 'confirmed').length,
      declined: guests.filter((g) => g.status === 'declined').length,
    };
  }
}
