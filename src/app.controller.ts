import { Controller, Get, Inject } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  async getHealth() {
    return this.appService.getHealth();
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Get('stats')
  async getStats(): Promise<{
    providers: number;
    services: number;
    categories: number;
    completed_bookings: number;
    total_events: number;
  }> {
    const [providers, services, categories, bookings, events] =
      await Promise.all([
        this.supabase
          .from('providers')
          .select('*', { count: 'exact', head: true }),
        this.supabase
          .from('services')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        this.supabase
          .from('categories')
          .select('*', { count: 'exact', head: true }),
        this.supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed'),
        this.supabase
          .from('events')
          .select('*', { count: 'exact', head: true }),
      ]);
    return {
      providers: providers.count || 0,
      services: services.count || 0,
      categories: categories.count || 0,
      completed_bookings: bookings.count || 0,
      total_events: events.count || 0,
    };
  }
}
