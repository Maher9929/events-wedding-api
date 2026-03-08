import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { SupabaseProvider } from '../config/supabase.config';

@Module({
  imports: [],
  controllers: [BookingsController],
  providers: [BookingsService, SupabaseProvider],
  exports: [BookingsService],
})
export class BookingsModule {}
