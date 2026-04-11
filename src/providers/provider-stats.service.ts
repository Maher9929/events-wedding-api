import { Injectable } from '@nestjs/common';
import { ProvidersService } from './providers.service';

@Injectable()
export class ProviderStatsService {
  constructor(private readonly providersService: ProvidersService) {}

  async getProviderStats(
    providerId: string,
    period?: 'week' | 'month' | 'year',
  ) {
    return this.providersService.getProviderStats(
      providerId,
      period || 'month',
    );
  }

  async getPerformanceMetrics(providerId: string) {
    return this.providersService.getPerformanceMetrics(providerId);
  }
}
