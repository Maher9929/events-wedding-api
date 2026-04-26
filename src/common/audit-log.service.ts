import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

export type AuditAction =
  | 'user_register'
  | 'user_login'
  | 'user_logout'
  | 'user_delete'
  | 'user_ban'
  | 'user_unban'
  | 'booking_create'
  | 'booking_confirm'
  | 'booking_cancel'
  | 'booking_complete'
  | 'booking_refund'
  | 'payment_intent_created'
  | 'payment_confirmed'
  | 'review_delete'
  | 'review_reported'
  | 'provider_delete';

type AuditLogRow = {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  user?: { full_name?: string; email?: string }[];
};

@Injectable()
export class AuditLogService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async log(
    userId: string | null,
    action: AuditAction,
    entityType: string,
    entityId?: string,
    details?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.supabase.from('audit_logs').insert({
        user_id: userId,
        action,
        entity: entityType,
        entity_id: entityId || null,
        metadata: details || {},
      });
    } catch {
      // Audit failures should never break the main business flow.
    }
  }

  async findAll(
    limit: number = 100,
    offset: number = 0,
  ): Promise<{
    data: Array<{
      id: string;
      action: string;
      entity_type: string;
      entity_id: string | null;
      user_email?: string;
      user_name?: string;
      details: string;
      created_at: string;
      severity: 'info' | 'warning' | 'critical';
    }>;
    total: number;
  }> {
    const { data, error, count } = await this.supabase
      .from('audit_logs')
      .select(
        `
        id,
        action,
        entity,
        entity_id,
        metadata,
        created_at,
        user:user_profiles(full_name, email)
      `,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + Math.min(limit, 200) - 1);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      data: ((data || []) as AuditLogRow[]).map((entry) => {
        const user = Array.isArray(entry.user) ? entry.user[0] : undefined;

        return {
          id: entry.id,
          action: this.normalizeAction(entry.action),
          entity_type: this.normalizeEntityType(entry.entity),
          entity_id: entry.entity_id || null,
          user_email: user?.email,
          user_name: user?.full_name,
          details: this.buildDetails(
            entry.action,
            entry.entity,
            entry.metadata || {},
          ),
          created_at: entry.created_at,
          severity: this.getSeverity(entry.action),
        };
      }),
      total: count || 0,
    };
  }

  private normalizeAction(action: string): string {
    const actionMap: Record<string, string> = {
      booking_create: 'booking_created',
      booking_confirm: 'booking_confirmed',
      booking_cancel: 'booking_cancelled',
      booking_complete: 'booking_completed',
      payment_confirmed: 'payment_received',
      user_register: 'user_created',
      review_delete: 'review_deleted',
      review_reported: 'review_reported',
      provider_delete: 'provider_deleted',
    };

    return actionMap[action] || action;
  }

  private normalizeEntityType(entity: string): string {
    const entityMap: Record<string, string> = {
      bookings: 'booking',
      booking: 'booking',
      users: 'user',
      user: 'user',
      payments: 'payment',
      payment: 'payment',
      providers: 'provider',
      provider: 'provider',
      reviews: 'review',
      review: 'review',
    };

    return entityMap[entity] || entity;
  }

  private getSeverity(action: string): 'info' | 'warning' | 'critical' {
    if (
      action.includes('delete') ||
      action.includes('ban') ||
      action.includes('refund')
    ) {
      return 'critical';
    }

    if (
      action.includes('cancel') ||
      action.includes('warn') ||
      action.includes('report')
    ) {
      return 'warning';
    }

    return 'info';
  }

  private buildDetails(
    action: string,
    entity: string,
    metadata: Record<string, any>,
  ): string {
    const parts: string[] = [];

    if (typeof metadata.amount === 'number') {
      parts.push(`amount: ${metadata.amount}`);
    }
    if (typeof metadata.role === 'string') {
      parts.push(`role: ${metadata.role}`);
    }
    if (typeof metadata.email === 'string') {
      parts.push(`email: ${metadata.email}`);
    }
    if (typeof metadata.status === 'string') {
      parts.push(`status: ${metadata.status}`);
    }
    if (typeof metadata.payment_type === 'string') {
      parts.push(`payment: ${metadata.payment_type}`);
    }
    if (typeof metadata.cancellation_reason === 'string') {
      parts.push(`reason: ${metadata.cancellation_reason}`);
    }

    if (parts.length > 0) {
      return parts.join(' | ');
    }

    return `${action} on ${entity}`;
  }
}
