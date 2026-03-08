import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { SupabaseProvider } from '../config/supabase.config';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, SupabaseProvider],
  exports: [ReviewsService],
})
export class ReviewsModule {}
