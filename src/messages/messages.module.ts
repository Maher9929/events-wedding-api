import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessagesGateway } from './messages.gateway';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';

import { SupabaseProvider } from '../config/supabase.config';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway, SupabaseProvider],
  exports: [MessagesService, MessagesGateway],
})
export class MessagesModule {}
