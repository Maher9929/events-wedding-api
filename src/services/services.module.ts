import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { SupabaseProvider } from '../config/supabase.config';

@Module({
  controllers: [ServicesController],
  providers: [ServicesService, SupabaseProvider],
  exports: [ServicesService],
})
export class ServicesModule {}
