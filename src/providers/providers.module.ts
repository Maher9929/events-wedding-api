import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { SupabaseProvider } from '../config/supabase.config';

@Module({
  controllers: [ProvidersController],
  providers: [ProvidersService, SupabaseProvider],
  exports: [ProvidersService],
})
export class ProvidersModule {}
