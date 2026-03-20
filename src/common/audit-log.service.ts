import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

export type AuditAction =
  | 'user_register'
  | 'user_login'
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

@Injectable()
export class AuditLogService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  /**
   * Log an auditable action. Non-critical — errors are swallowed so they never
   * break the main business flow.
   */
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
        details: details || {},
      });
    } catch {
      // Non-critical — audit failures should never break main flow
    }
  }
}
