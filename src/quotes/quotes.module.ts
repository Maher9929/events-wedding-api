import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { ConfigModule } from '@nestjs/config';
import { MessagesModule } from '../messages/messages.module';

import { SupabaseProvider } from '../config/supabase.config';

@Module({
  imports: [ConfigModule, MessagesModule],
  controllers: [QuotesController],
  providers: [QuotesService, SupabaseProvider],
})
export class QuotesModule {}
