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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { SupabaseClient } from '@supabase/supabase-js';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default 50)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset' })
  @ApiQuery({ name: 'unread', required: false, description: 'Filter unread only (true/false)' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by notification type' })
  @ApiResponse({ status: 200, description: 'Notifications list with total count' })
  async getMyNotifications(
    @Request() req: AuthenticatedRequest,
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
  @ApiOperation({ summary: 'Get unread notifications count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@Request() req: AuthenticatedRequest) {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) return { count: 0 };
    return { count: count || 0 };
  }

  @Patch('id/:id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
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
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Request() req: AuthenticatedRequest) {
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
  @ApiOperation({ summary: 'Delete read notifications older than 30 days' })
  @ApiResponse({ status: 204, description: 'Old notifications cleaned up' })
  async cleanupOld(@Request() req: AuthenticatedRequest) {
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
  @ApiOperation({ summary: 'Delete a single notification' })
  @ApiResponse({ status: 204, description: 'Notification deleted' })
  async deleteOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    await this.supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all read notifications' })
  @ApiResponse({ status: 204, description: 'All read notifications deleted' })
  async deleteAll(@Request() req: AuthenticatedRequest) {
    await this.supabase
      .from('notifications')
      .delete()
      .eq('user_id', req.user.id)
      .eq('is_read', true);
  }
}
