import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  CreateBookingDto,
  UpdateBookingStatusDto,
} from './dto/create-booking.dto';
import { Booking } from './entities/booking.entity';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  private stripe: Stripe;

  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') || '',
      {
        apiVersion: '2023-10-16' as any,
      },
    );
  }

  async create(clientId: string, dto: CreateBookingDto): Promise<Booking> {
    // Resolve provider_id: if it's a provider table ID, get the user_id
    let resolvedProviderId = dto.provider_id;
    const { data: providerUser } = await this.supabase
      .from('providers')
      .select('user_id')
      .eq('id', dto.provider_id)
      .single();

    if (providerUser) {
      resolvedProviderId = providerUser.user_id;
    }

    let finalAmount = dto.amount;
    // Apply promo code if provided
    if (dto.promo_code_id) {
      const { data: promo } = await this.supabase
        .from('promo_codes')
        .select('*')
        .eq('id', dto.promo_code_id)
        .eq('is_active', true)
        .single();

      if (promo) {
        if (promo.type === 'percentage') {
          finalAmount = finalAmount * (1 - promo.value / 100);
        } else {
          finalAmount = Math.max(0, finalAmount - promo.value);
        }
      }
    }

    const { data, error } = await this.supabase
      .from('bookings')
      .insert({
        client_id: clientId,
        provider_id: resolvedProviderId,
        service_id: dto.service_id,
        amount: finalAmount,
        status: 'pending',
        payment_status: 'pending',
        notes: dto.notes,
        requirements: dto.requirements,
        location: dto.location,
        guest_count: dto.guest_count,
        booking_date: dto.booking_date,
        start_time: dto.start_time,
        end_time: dto.end_time,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(
        `Error creating booking for client ${clientId}: ${JSON.stringify(error)}`,
      );
      throw new BadRequestException(error.message);
    }

    // Create in-app notification for provider
    await this.createNotification(
      resolvedProviderId,
      'booking_request',
      'طلب حجز جديد',
      `لديك طلب حجز جديد بانتظار موافقتك`,
      data.id,
    );
    // Create in-app notification for client
    await this.createNotification(
      clientId,
      'booking_created',
      'تم إرسال طلب الحجز',
      `تم إرسال طلب حجزك بنجاح وهو قيد المراجعة`,
      data.id,
    );

    return data;
  }

  private async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    bookingId?: string,
  ): Promise<void> {
    const { error } = await this.supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      data: { booking_id: bookingId },
      is_read: false,
    });

    if (error) {
      this.logger.warn(
        `Failed to create notification for user ${userId}: ${error.message}`,
      );
    }
  }

  async findOne(id: string, userId?: string): Promise<Booking> {
    let query = this.supabase.from('bookings').select('*').eq('id', id);

    if (userId) {
      query = query.or(`client_id.eq.${userId},provider_id.eq.${userId}`);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      throw new NotFoundException('Booking not found');
    }

    return data;
  }

  async updateStatus(
    id: string,
    userId: string,
    dto: UpdateBookingStatusDto,
  ): Promise<Booking> {
    const booking = await this.findOne(id, userId);

    // Check if user is authorized to update this booking
    if (booking.client_id !== userId && booking.provider_id !== userId) {
      throw new ForbiddenException('You can only update your own bookings');
    }

    // Only provider can confirm/reject booking
    if (
      ['confirmed', 'rejected'].includes(dto.status) &&
      booking.provider_id !== userId
    ) {
      throw new ForbiddenException(
        'Only provider can confirm or reject booking',
      );
    }

    // Only client can cancel booking
    if (dto.status === 'cancelled' && booking.client_id !== userId) {
      throw new ForbiddenException('Only client can cancel booking');
    }

    const updateData: any = {
      status: dto.status,
      updated_at: new Date().toISOString(),
    };

    if (dto.cancellation_reason) {
      updateData.cancellation_reason = dto.cancellation_reason;
      updateData.cancelled_at = new Date().toISOString();
    }

    if ((dto as any).refund) {
      updateData.payment_status = 'refunded';
    }

    const { data, error } = await this.supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Notify the other party about status change
    const notifyUserId =
      booking.client_id === userId ? booking.provider_id : booking.client_id;
    const statusMessages: any = {
      confirmed: {
        title: 'تم تأكيد الحجز',
        message: 'تم تأكيد طلب الحجز بنجاح',
      },
      rejected: { title: 'تم رفض الحجز', message: 'تم رفض طلب الحجز' },
      cancelled: { title: 'تم إلغاء الحجز', message: 'تم إلغاء طلب الحجز' },
      completed: { title: 'تم إكمال الحجز', message: 'تم إكمال الخدمة بنجاح' },
    };
    const notif = statusMessages[dto.status];
    if (notif && notifyUserId) {
      await this.createNotification(
        notifyUserId,
        `booking_${dto.status}`,
        notif.title,
        notif.message,
        id,
      );
    }

    return data;
  }

  async applyPaymentToBooking(
    bookingId: string,
    paymentIntentId: string,
    amount: number,
    paymentType: 'deposit' | 'balance' | 'full',
  ): Promise<Booking> {
    const { data: booking, error: fetchError } = await this.supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check if this payment intent was already processed
    const { data: existingPayment } = await this.supabase
      .from('payments')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (existingPayment) {
      this.logger.warn(`Payment intent ${paymentIntentId} already processed`);
      return booking;
    }

    // Record the payment
    const { error: paymentError } = await this.supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        amount,
        payment_type: paymentType,
        stripe_payment_intent_id: paymentIntentId,
        status: 'completed',
      });

    if (paymentError) {
      throw new BadRequestException('Failed to record payment');
    }

    // Update booking payment status
    let newPaymentStatus = booking.payment_status;
    if (paymentType === 'full') {
      newPaymentStatus = 'fully_paid';
    } else if (paymentType === 'deposit') {
      newPaymentStatus = 'deposit_paid';
    } else if (
      paymentType === 'balance' &&
      booking.payment_status === 'deposit_paid'
    ) {
      newPaymentStatus = 'fully_paid';
    }

    const { data: updatedBooking, error: updateError } = await this.supabase
      .from('bookings')
      .update({ payment_status: newPaymentStatus })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      throw new BadRequestException('Failed to update booking payment status');
    }

    // Create notification
    await this.createNotification(
      booking.client_id,
      'payment_received',
      'تم استلام الدفعة',
      `تم استلام دفعة ${paymentType === 'deposit' ? 'التأمين' : paymentType === 'balance' ? 'المتبقي' : 'الكامل'} بنجاح`,
      bookingId,
    );

    return updatedBooking;
  }

  async createPaymentIntent(
    bookingId: string,
    userId: string,
    paymentType: 'deposit' | 'balance' | 'full',
  ): Promise<{ client_secret: string; payment_intent_id: string }> {
    const booking = await this.findOne(bookingId, userId);

    if (booking.client_id !== userId) {
      throw new ForbiddenException(
        'Only client can create payment for booking',
      );
    }

    let amount = booking.amount;
    if (paymentType === 'deposit') {
      amount = Math.round(amount * 0.3); // 30% deposit
    } else if (paymentType === 'balance') {
      amount = Math.round(amount * 0.7); // 70% balance
    }

    const isMock =
      !this.configService.get<string>('STRIPE_SECRET_KEY') ||
      this.configService
        .get<string>('STRIPE_SECRET_KEY')
        ?.includes('YOUR_STRIPE_SECRET_KEY');

    if (isMock) {
      this.logger.log(`Creating MOCK payment intent for booking ${bookingId}`);
      return {
        client_secret: `pi_mock_${bookingId}_secret_${Date.now()}`,
        payment_intent_id: `pi_mock_${bookingId}`,
      };
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'qar',
      metadata: {
        booking_id: bookingId,
        payment_type: paymentType,
      },
    });

    return {
      client_secret: paymentIntent.client_secret || '',
      payment_intent_id: paymentIntent.id,
    };
  }

  async confirmMockPayment(
    bookingId: string,
    paymentIntentId: string,
    paymentType: string,
  ): Promise<void> {
    const booking = await this.supabase
      .from('bookings')
      .select('amount')
      .eq('id', bookingId)
      .single();
    if (!booking.data) throw new NotFoundException('Booking not found');

    let amount = booking.data.amount;
    if (paymentType === 'deposit') amount *= 0.3;
    else if (paymentType === 'balance') amount *= 0.7;

    await this.applyPaymentToBooking(
      bookingId,
      paymentIntentId,
      amount,
      paymentType as any,
    );
  }

  async confirmPayment(paymentIntentId: string): Promise<void> {
    const paymentIntent =
      await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Payment not successful');
    }

    const bookingId = paymentIntent.metadata.booking_id;
    const paymentType = paymentIntent.metadata.payment_type as
      | 'deposit'
      | 'balance'
      | 'full';
    const amount = paymentIntent.amount / 100;

    await this.applyPaymentToBooking(
      bookingId,
      paymentIntentId,
      amount,
      paymentType,
    );
  }

  // Additional methods for controller
  async findAll(
    status?: string,
    paymentStatus?: string,
    limit?: number,
    offset?: number,
    search?: string,
    sortBy?: string,
    sortOrder?: string,
  ): Promise<Booking[]> {
    let query = this.supabase.from('bookings').select('*');

    if (status) {
      query = query.eq('status', status);
    }
    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }
    if (search) {
      query = query.or(
        `notes.ilike.%${search}%,requirements.ilike.%${search}%`,
      );
    }
    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }
    if (sortBy && sortOrder) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      throw new BadRequestException(error.message);
    }
    return data || [];
  }

  async findByClient(
    clientId: string,
    status?: string,
    limit?: number,
    offset?: number,
    search?: string,
    sortOrder?: string,
  ): Promise<Booking[]> {
    let query = this.supabase
      .from('bookings')
      .select('*')
      .eq('client_id', clientId);

    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(
        `notes.ilike.%${search}%,requirements.ilike.%${search}%`,
      );
    }
    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }
    query = query.order('created_at', { ascending: sortOrder !== 'desc' });

    const { data, error } = await query;
    if (error) {
      throw new BadRequestException(error.message);
    }
    return data || [];
  }

  async findByProvider(
    providerId: string,
    status?: string,
    paymentStatus?: string,
    limit?: number,
    offset?: number,
    search?: string,
    sortOrder?: string,
  ): Promise<Booking[]> {
    let query = this.supabase
      .from('bookings')
      .select('*')
      .eq('provider_id', providerId);

    if (status) {
      query = query.eq('status', status);
    }
    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }
    if (search) {
      query = query.or(
        `notes.ilike.%${search}%,requirements.ilike.%${search}%`,
      );
    }
    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }
    query = query.order('created_at', { ascending: sortOrder !== 'desc' });

    const { data, error } = await query;
    if (error) {
      throw new BadRequestException(error.message);
    }
    return data || [];
  }

  async getStats(providerId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('bookings')
      .select('*')
      .eq('provider_id', providerId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const bookings = data || [];
    const total = bookings.length;
    const completed = bookings.filter((b) => b.status === 'completed').length;
    const pending = bookings.filter((b) => b.status === 'pending').length;
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    const totalRevenue = bookings
      .filter((b) => b.payment_status === 'fully_paid')
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    return {
      total_bookings: total,
      completed_bookings: completed,
      pending_bookings: pending,
      confirmed_bookings: confirmed,
      cancelled_bookings: cancelled,
      total_revenue: totalRevenue,
    };
  }

  async getAdminStats(): Promise<any> {
    const { data, error } = await this.supabase.from('bookings').select('*');

    if (error) {
      throw new BadRequestException(error.message);
    }

    const bookings = data || [];
    const total = bookings.length;
    const completed = bookings.filter((b) => b.status === 'completed').length;
    const pending = bookings.filter((b) => b.status === 'pending').length;
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    const totalRevenue = bookings
      .filter(
        (b) => b.payment_status === 'fully_paid' || b.status === 'completed',
      )
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    // Calculate monthly revenue for last 6 months
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString('en-US', { month: 'short' });
      const monthRevenue = bookings
        .filter((b) => {
          const bd = new Date(b.created_at);
          return (
            bd.getMonth() === d.getMonth() &&
            bd.getFullYear() === d.getFullYear() &&
            (b.payment_status === 'fully_paid' || b.status === 'completed')
          );
        })
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      monthlyRevenue.push({ month: monthLabel, revenue: monthRevenue });
    }

    return {
      total_bookings: total,
      completed,
      pending,
      confirmed,
      cancelled,
      total_revenue: totalRevenue,
      monthly_revenue: monthlyRevenue,
    };
  }
}
