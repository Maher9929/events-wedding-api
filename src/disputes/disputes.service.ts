import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

export interface Dispute {
  id: string;
  booking_id: string;
  opened_by: string;
  reason: string;
  description: string;
  evidence_urls: string[];
  status: 'open' | 'under_review' | 'resolved' | 'closed';
  resolution?: string;
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  provider_response?: string;
  provider_responded_at?: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async create(
    userId: string,
    dto: {
      booking_id: string;
      reason: string;
      description: string;
      evidence_urls?: string[];
    },
  ): Promise<Dispute> {
    // Verify the booking belongs to this user (client)
    const { data: booking } = await this.supabase
      .from('bookings')
      .select('id, client_id, provider_id, status')
      .eq('id', dto.booking_id)
      .maybeSingle();

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.client_id !== userId) {
      throw new ForbiddenException('Only the client can open a dispute');
    }

    if (!['confirmed', 'completed'].includes(booking.status)) {
      throw new BadRequestException(
        'Disputes can only be opened for confirmed or completed bookings',
      );
    }

    // Check for existing open dispute on this booking
    const { data: existing } = await this.supabase
      .from('disputes')
      .select('id')
      .eq('booking_id', dto.booking_id)
      .in('status', ['open', 'under_review'])
      .maybeSingle();

    if (existing) {
      throw new BadRequestException(
        'An active dispute already exists for this booking',
      );
    }

    const { data, error } = await this.supabase
      .from('disputes')
      .insert({
        booking_id: dto.booking_id,
        opened_by: userId,
        reason: dto.reason,
        description: dto.description,
        evidence_urls: dto.evidence_urls || [],
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating dispute: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    // Notify provider
    try {
      await this.supabase.from('notifications').insert({
        user_id: booking.provider_id,
        type: 'dispute_opened',
        title: 'New dispute',
        message: `A dispute has been opened on the booking — reason: ${dto.reason}`,
        is_read: false,
        data: { dispute_id: data.id, booking_id: dto.booking_id },
      });
    } catch (e) {
      this.logger.warn(`Failed to notify provider: ${e}`);
    }

    return data;
  }

  async getMyDisputes(userId: string): Promise<Dispute[]> {
    const { data, error } = await this.supabase
      .from('disputes')
      .select(
        `*, bookings(id, booking_date, amount, status, service_id, services(title))`,
      )
      .eq('opened_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }
    return data || [];
  }

  async getDisputesByProvider(providerId: string): Promise<Dispute[]> {
    // Get bookings for this provider, then get disputes
    const { data, error } = await this.supabase
      .from('disputes')
      .select(
        `*, bookings!inner(id, booking_date, amount, status, provider_id, service_id, services(title))`,
      )
      .eq('bookings.provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }
    return data || [];
  }

  async getAllDisputes(status?: string): Promise<Dispute[]> {
    let query = this.supabase
      .from('disputes')
      .select(
        `*, 
        bookings(id, booking_date, amount, status, service_id, client_id, provider_id, 
          services(title)),
        opener:user_profiles!disputes_opened_by_fkey(id, full_name, email)`,
      )
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(error.message);
    }
    return data || [];
  }

  async providerRespond(
    disputeId: string,
    userId: string,
    response: string,
  ): Promise<Dispute> {
    // Verify provider owns the booking
    const { data: dispute } = await this.supabase
      .from('disputes')
      .select('*, bookings(provider_id)')
      .eq('id', disputeId)
      .maybeSingle();

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const booking = dispute.bookings as unknown as { provider_id: string };

    // Provider may be identified by user_id OR provider_id; check via providers table
    const { data: providerRecord } = await this.supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    const isProvider =
      booking.provider_id === userId ||
      (providerRecord && booking.provider_id === providerRecord.id);

    if (!isProvider) {
      throw new ForbiddenException('Only the provider can respond');
    }

    if (!['open', 'under_review'].includes(dispute.status)) {
      throw new BadRequestException('Dispute is already resolved');
    }

    const { data, error } = await this.supabase
      .from('disputes')
      .update({
        provider_response: response,
        provider_responded_at: new Date().toISOString(),
        status: 'under_review',
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async resolve(
    disputeId: string,
    adminId: string,
    dto: { resolution: string; resolution_notes?: string },
  ): Promise<Dispute> {
    const { data: dispute } = await this.supabase
      .from('disputes')
      .select('*, bookings(id, amount, client_id, provider_id)')
      .eq('id', disputeId)
      .maybeSingle();

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (['resolved', 'closed'].includes(dispute.status)) {
      throw new BadRequestException('Dispute is already resolved');
    }

    const { data, error } = await this.supabase
      .from('disputes')
      .update({
        status: 'resolved',
        resolution: dto.resolution,
        resolution_notes: dto.resolution_notes,
        resolved_by: adminId,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Handle refund if applicable
    const booking = dispute.bookings as unknown as {
      id: string;
      amount: number;
      client_id: string;
      provider_id: string;
    };

    if (dto.resolution === 'refund_full' && booking) {
      await this.supabase
        .from('bookings')
        .update({
          payment_status: 'refunded',
          refund_amount: booking.amount,
          refund_percentage: 100,
        })
        .eq('id', booking.id);
    } else if (dto.resolution === 'refund_partial' && booking) {
      await this.supabase
        .from('bookings')
        .update({
          payment_status: 'refunded',
          refund_amount: Math.round(booking.amount * 0.5 * 100) / 100,
          refund_percentage: 50,
        })
        .eq('id', booking.id);
    }

    // Notify both parties
    const notifyIds = [booking?.client_id, booking?.provider_id].filter(
      Boolean,
    );
    for (const uid of notifyIds) {
      try {
        await this.supabase.from('notifications').insert({
          user_id: uid,
          type: 'dispute_resolved',
          title: 'Dispute resolved',
          message: `The dispute has been resolved — decision: ${dto.resolution}`,
          is_read: false,
          data: { dispute_id: disputeId, resolution: dto.resolution },
        });
      } catch (e) {
        this.logger.warn(`Failed to notify user ${uid}: ${e}`);
      }
    }

    return data;
  }
}
