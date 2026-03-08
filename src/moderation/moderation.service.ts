import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

export interface ReportDto {
  reporter_id: string;
  reported_type:
    | 'provider'
    | 'service'
    | 'review'
    | 'user'
    | 'booking'
    | 'quote';
  reported_id: string;
  reason: string;
  description: string;
  evidence_urls?: string[];
}

export interface ModerationAction {
  action: 'approve' | 'reject' | 'ban' | 'suspend' | 'warn';
  notes?: string;
  duration_days?: number;
}

@Injectable()
export class ModerationService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async createReport(reportDto: ReportDto, reporterId: string) {
    const { data, error } = await this.supabase
      .from('moderation_reports')
      .insert({
        ...reportDto,
        reporter_id: reporterId,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getReports(status?: string, type?: string, limit = 50, offset = 0) {
    let query = this.supabase
      .from('moderation_reports')
      .select(
        `
                *,
                reporter:user_profiles(id, full_name, email),
                reported_provider:providers(id, company_name, user_id),
                reported_service:services(id, title),
                reported_review:reviews(id, rating, comment),
                reported_user:user_profiles(id, full_name, email)
            `,
      )
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (type && type !== 'all') {
      query = query.eq('reported_type', type);
    }

    const { data, error } = await query.range(offset, offset + limit - 1);
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async updateReport(
    reportId: string,
    action: ModerationAction,
    moderatorId: string,
  ) {
    // Get the report first
    const { data: report, error: reportError } = await this.supabase
      .from('moderation_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      throw new NotFoundException('Report not found');
    }

    // Update report status
    const { data: updatedReport, error: updateError } = await this.supabase
      .from('moderation_reports')
      .update({
        status: action.action === 'approve' ? 'approved' : 'rejected',
        moderator_id: moderatorId,
        moderator_notes: action.notes,
        moderated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select()
      .single();

    if (updateError) throw new BadRequestException(updateError.message);

    // Apply moderation action based on decision
    await this.applyModerationAction(report, action, moderatorId);

    return updatedReport;
  }

  private async applyModerationAction(
    report: any,
    action: ModerationAction,
    moderatorId: string,
  ) {
    const { reported_type, reported_id } = report;

    switch (action.action) {
      case 'ban':
        await this.banEntity(
          reported_type,
          reported_id,
          action.duration_days || 30,
          action.notes,
        );
        break;
      case 'suspend':
        await this.suspendEntity(
          reported_type,
          reported_id,
          action.duration_days || 7,
          action.notes,
        );
        break;
      case 'reject':
        await this.rejectEntity(reported_type, reported_id, action.notes);
        break;
      case 'warn':
        await this.warnEntity(reported_type, reported_id, action.notes);
        break;
    }

    // Log moderation action
    await this.supabase.from('moderation_logs').insert({
      report_id: report.id,
      moderator_id: moderatorId,
      action: action.action,
      details: action.notes,
      created_at: new Date().toISOString(),
    });
  }

  private async banEntity(
    type: string,
    entityId: string,
    durationDays: number,
    notes?: string,
  ) {
    const banUntil = new Date();
    banUntil.setDate(banUntil.getDate() + durationDays);

    switch (type) {
      case 'provider':
        await this.supabase
          .from('providers')
          .update({
            is_banned: true,
            ban_until: banUntil.toISOString(),
            ban_reason: notes,
          })
          .eq('id', entityId);
        break;
      case 'user':
        await this.supabase
          .from('user_profiles')
          .update({
            is_banned: true,
            ban_until: banUntil.toISOString(),
            ban_reason: notes,
          })
          .eq('id', entityId);
        break;
      case 'service':
        await this.supabase
          .from('services')
          .update({
            is_active: false,
            moderation_status: 'banned',
            moderation_notes: notes,
          })
          .eq('id', entityId);
        break;
    }
  }

  private async suspendEntity(
    type: string,
    entityId: string,
    durationDays: number,
    notes?: string,
  ) {
    const suspendUntil = new Date();
    suspendUntil.setDate(suspendUntil.getDate() + durationDays);

    switch (type) {
      case 'provider':
        await this.supabase
          .from('providers')
          .update({
            is_suspended: true,
            suspend_until: suspendUntil.toISOString(),
            suspension_reason: notes,
          })
          .eq('id', entityId);
        break;
      case 'service':
        await this.supabase
          .from('services')
          .update({
            is_active: false,
            moderation_status: 'suspended',
            moderation_notes: notes,
          })
          .eq('id', entityId);
        break;
    }
  }

  private async rejectEntity(type: string, entityId: string, notes?: string) {
    switch (type) {
      case 'service':
        await this.supabase
          .from('services')
          .update({
            moderation_status: 'rejected',
            moderation_notes: notes,
          })
          .eq('id', entityId);
        break;
      case 'review':
        await this.supabase
          .from('reviews')
          .update({
            is_hidden: true,
            moderation_notes: notes,
          })
          .eq('id', entityId);
        break;
    }
  }

  private async warnEntity(type: string, entityId: string, notes?: string) {
    // Send warning notification (implementation depends on notification system)
    await this.supabase.from('notifications').insert({
      user_id: entityId,
      type: 'moderation_warning',
      title: 'Avertisse de modération',
      message: notes || 'Votre contenu a reçu un avertisse de modération.',
      created_at: new Date().toISOString(),
    });
  }

  async getKycPending() {
    const { data, error } = await this.supabase
      .from('kyc_documents')
      .select(
        `
                *,
                provider:providers(id, company_name, user_id),
                user:user_profiles(id, full_name, email)
            `,
      )
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async reviewKycDocument(
    documentId: string,
    status: 'approved' | 'rejected',
    notes?: string,
    reviewerId?: string,
  ) {
    const { data, error } = await this.supabase
      .from('kyc_documents')
      .update({
        status,
        reviewer_notes: notes,
        reviewed_at: new Date().toISOString(),
        reviewer_id: reviewerId,
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // If approved, update provider verification status
    if (status === 'approved') {
      const { data: document } = await this.supabase
        .from('kyc_documents')
        .select('provider_id')
        .eq('id', documentId)
        .single();

      if (document?.provider_id) {
        await this.supabase
          .from('providers')
          .update({
            is_verified: true,
            verification_date: new Date().toISOString(),
          })
          .eq('id', document.provider_id);
      }
    }

    return data;
  }

  async getModerationStats() {
    const [reportsResult, kycResult, bannedResult] = await Promise.all([
      this.supabase
        .from('moderation_reports')
        .select('status, created_at')
        .gte(
          'created_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        ),
      this.supabase
        .from('kyc_documents')
        .select('status, submitted_at')
        .gte(
          'submitted_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        ),
      this.supabase
        .from('providers')
        .select('is_banned, is_suspended')
        .or('is_banned.eq.true, is_suspended.eq.true'),
    ]);

    const reports = reportsResult.data || [];
    const kyc = kycResult.data || [];
    const banned = bannedResult.data || [];

    return {
      reports: {
        total: reports.length,
        pending: reports.filter((r) => r.status === 'pending').length,
        resolved: reports.filter(
          (r) => r.status === 'approved' || r.status === 'rejected',
        ).length,
      },
      kyc: {
        total: kyc.length,
        pending: kyc.filter((k) => k.status === 'pending').length,
        approved: kyc.filter((k) => k.status === 'approved').length,
        rejected: kyc.filter((k) => k.status === 'rejected').length,
      },
      enforcement: {
        banned: banned.filter((p) => p.is_banned).length,
        suspended: banned.filter((p) => p.is_suspended).length,
      },
    };
  }
}
