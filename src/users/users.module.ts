import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SupabaseProvider } from '../config/supabase.config';
import { AuthModule } from '../auth/auth.module';
import { AuditLogService } from '../common/audit-log.service';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, SupabaseProvider, AuditLogService],
  exports: [UsersService],
})
export class UsersModule {}
