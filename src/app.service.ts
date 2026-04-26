import { Injectable, Inject, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthCacheService } from './auth/auth-cache.service';

export interface HealthCheck {
  status: 'up' | 'down';
  latencyMs?: number;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    cache: HealthCheck;
  };
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
    private readonly authCache: AuthCacheService,
  ) {}

  getHello(): string {
    return 'Doha Events & Wedding Marketplace API';
  }

  async getHealth(): Promise<HealthResponse> {
    const [dbCheck, cacheCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkCache(),
    ]);

    const allUp = dbCheck.status === 'up' && cacheCheck.status === 'up';
    const allDown = dbCheck.status === 'down' && cacheCheck.status === 'down';

    return {
      status: allUp ? 'healthy' : allDown ? 'unhealthy' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'doha-events-backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      checks: {
        database: dbCheck,
        cache: cacheCheck,
      },
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await this.supabase.from('categories').select('id').limit(1);
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (err) {
      this.logger.warn(`Database health check failed: ${err}`);
      return { status: 'down', latencyMs: Date.now() - start };
    }
  }

  private async checkCache(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const testKey = '__health_check__';
      await this.authCache.cacheUser(testKey, 'health', null);
      const result = await this.authCache.getCachedUser(testKey);
      await this.authCache.invalidateUser(testKey);
      return { status: result ? 'up' : 'down', latencyMs: Date.now() - start };
    } catch (err) {
      this.logger.warn(`Cache health check failed: ${err}`);
      return { status: 'down', latencyMs: Date.now() - start };
    }
  }
}
