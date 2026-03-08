import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

import { SupabaseProvider } from '../config/supabase.config';

@Module({
  imports: [ConfigModule],
  controllers: [MessagesController],
  providers: [MessagesService, SupabaseProvider],
  exports: [MessagesService],
})
export class MessagesModule {}
