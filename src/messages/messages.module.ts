import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { ConfigModule } from '@nestjs/config';

import { SupabaseProvider } from '../config/supabase.config';

@Module({
  imports: [ConfigModule],
  controllers: [MessagesController],
  providers: [MessagesService, SupabaseProvider],
  exports: [MessagesService],
})
export class MessagesModule {}
