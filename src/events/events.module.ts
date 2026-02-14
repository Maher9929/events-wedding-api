import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { SupabaseProvider } from '../config/supabase.config';

@Module({
  controllers: [EventsController],
  providers: [EventsService, SupabaseProvider],
  exports: [EventsService],
})
export class EventsModule {}
