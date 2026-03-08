import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { ProviderStatsService } from './provider-stats.service';
import { ProviderStatsController } from './provider-stats.controller';
import { SupabaseProvider } from '../config/supabase.config';

@Module({
  controllers: [ProvidersController, ProviderStatsController],
  providers: [ProvidersService, ProviderStatsService, SupabaseProvider],
  exports: [ProvidersService, ProviderStatsService],
})
export class ProvidersModule {}
