import { Module } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { DisputesController } from './disputes.controller';
import { SupabaseProvider } from '../config/supabase.config';

@Module({
  controllers: [DisputesController],
  providers: [DisputesService, SupabaseProvider],
  exports: [DisputesService],
})
export class DisputesModule {}
