import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupabaseClient } from '@supabase/supabase-js';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  @Get()
  async getMyNotifications(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('unread') unread?: string,
    @Query('type') type?: string,
  ) {
    const lim = limit ? parseInt(limit) : 50;
    const off = offset ? parseInt(offset) : 0;
    let q = this.supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (unread === 'true') {
      q = q.eq('is_read', false);
    }

    if (type) {
      q = q.eq('type', type);
    }

    q = q.range(off, off + lim - 1);

    const { data, error, count } = await q;
    if (error) return { data: [], total: 0 };
    return { data: data || [], total: count || 0 };
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) return { count: 0 };
    return { count: count || 0 };
  }

  @Patch('id/:id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    const { data, error } = await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) return { success: false };
    return { success: true, data };
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req) {
    const { error } = await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) return { success: false };
    return { success: true };
  }

  @Delete('cleanup')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cleanupOld(@Request() req) {
    const cutoff = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    await this.supabase
      .from('notifications')
      .delete()
      .eq('user_id', req.user.id)
      .eq('is_read', true)
      .lt('created_at', cutoff);
  }

  @Delete('id/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOne(@Param('id') id: string, @Request() req) {
    await this.supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAll(@Request() req) {
    await this.supabase
      .from('notifications')
      .delete()
      .eq('user_id', req.user.id)
      .eq('is_read', true);
  }
}
