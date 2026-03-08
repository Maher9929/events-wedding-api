import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { CreateQuoteRequestDto } from './dto/quote-request.dto';
import { Quote } from './entities/quote.entity';
import { QuoteRequest } from './entities/quote-request.entity';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class QuotesService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
    private readonly messagesService: MessagesService,
  ) {}

  async findByUser(
    userId: string,
    status?: string,
    limit?: number,
    offset?: number,
    search?: string,
  ): Promise<{ data: Quote[]; total: number }> {
    let q = this.supabase
      .from('quotes')
      .select('*', { count: 'exact' })
      .or(`provider_id.eq.${userId},client_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      q = q.eq('status', status);
    }

    if (search) {
      q = q.ilike('note', `%${search}%`);
    }

    if (limit !== undefined && offset !== undefined) {
      q = q.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await q;
    if (error) throw new Error(error.message);
    return { data: data || [], total: count || 0 };
  }

  async findOne(id: string, userId: string): Promise<Quote> {
    const { data, error } = await this.supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .or(`provider_id.eq.${userId},client_id.eq.${userId}`)
      .single();

    if (error) throw new NotFoundException('Quote not found');
    return data;
  }

  async create(
    providerId: string,
    createQuoteDto: CreateQuoteDto,
  ): Promise<Quote> {
    // Calculate totals
    const subtotal = createQuoteDto.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const discountAmount = createQuoteDto.discount_amount || 0;
    const taxRate = createQuoteDto.tax_rate || 0;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (taxRate / 100);
    const totalAmount = taxableAmount + taxAmount;

    const { data, error } = await this.supabase
      .from('quotes')
      .insert({
        provider_id: providerId,
        client_id: createQuoteDto.client_id,
        items_json: createQuoteDto.items,
        subtotal,
        discount_amount: discountAmount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: createQuoteDto.status || 'draft',
        valid_until:
          createQuoteDto.valid_until ||
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
        notes: createQuoteDto.notes,
        terms: createQuoteDto.terms,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async createQuoteRequest(
    clientId: string,
    createQuoteRequestDto: CreateQuoteRequestDto,
  ): Promise<QuoteRequest> {
    const { data, error } = await this.supabase
      .from('quote_requests')
      .insert({
        ...createQuoteRequestDto,
        client_id: clientId,
        status: createQuoteRequestDto.status || 'open',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async findQuoteRequests(
    clientId?: string,
    status?: string,
  ): Promise<QuoteRequest[]> {
    let query = this.supabase
      .from('quote_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  async findAll(
    status?: string,
    providerId?: string,
    clientId?: string,
    limit?: number,
    offset?: number,
    search?: string,
    sortOrder?: string,
  ): Promise<{ data: Quote[]; total: number }> {
    let q = this.supabase
      .from('quotes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: sortOrder === 'asc' });

    if (status && status !== 'all') {
      q = q.eq('status', status);
    }

    if (providerId) {
      q = q.eq('provider_id', providerId);
    }

    if (clientId) {
      q = q.eq('client_id', clientId);
    }

    if (search) {
      q = q.ilike('note', `%${search}%`);
    }

    if (limit !== undefined && offset !== undefined) {
      q = q.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await q;
    if (error) throw new Error(error.message);
    return { data: data || [], total: count || 0 };
  }

  async send(id: string, providerId: string): Promise<Quote> {
    const { data: quote, error } = await this.supabase
      .from('quotes')
      .update({ status: 'sent' })
      .eq('id', id)
      .eq('provider_id', providerId)
      .select()
      .single();

    if (error) throw new NotFoundException('Quote not found or access denied');

    // Trigger message in conversation
    await this.messagesService.sendMessage(providerId, {
      conversation_id: quote.conversation_id,
      content: `I have sent you a quote for ${quote.total_amount} MAD`,
      type: 'quote_offer',
      metadata: { quote_id: quote.id },
    });

    // Notify client about new quote
    try {
      await this.supabase.from('notifications').insert({
        user_id: quote.client_id,
        type: 'quote',
        title: 'عرض سعر جديد',
        message: `لديك عرض سعر جديد بمبلغ ${quote.total_amount}`,
        is_read: false,
        data: { quote_id: quote.id },
      });
    } catch {
      /* silent */
    }

    return quote;
  }

  async remove(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('quotes')
      .delete()
      .eq('id', id)
      .or(`provider_id.eq.${userId},client_id.eq.${userId}`);

    if (error) throw new NotFoundException('Quote not found or access denied');
  }

  async updateStatus(
    id: string,
    userId: string,
    status: 'accepted' | 'rejected',
  ): Promise<Quote> {
    // Fetch quote first to check expiration
    const { data: existing } = await this.supabase
      .from('quotes')
      .select('valid_until, status')
      .eq('id', id)
      .eq('client_id', userId)
      .single();

    if (!existing)
      throw new NotFoundException('Quote not found or access denied');

    if (
      status === 'accepted' &&
      existing.valid_until &&
      new Date(existing.valid_until) < new Date()
    ) {
      throw new ForbiddenException(
        'This quote has expired and can no longer be accepted',
      );
    }

    const { data: quote, error } = await this.supabase
      .from('quotes')
      .update({ status })
      .eq('id', id)
      .eq('client_id', userId)
      .select()
      .single();

    if (error) throw new NotFoundException('Quote not found or access denied');

    // Notify provider via message
    await this.messagesService.sendMessage(userId, {
      conversation_id: quote.conversation_id,
      content: `Quote ${status.toUpperCase()}`,
      type: 'text',
      metadata: { quote_id: quote.id, status },
    });

    // Notify provider about quote status change
    try {
      const statusTitle =
        status === 'accepted' ? 'تم قبول عرض السعر' : 'تم رفض عرض السعر';
      const statusMsg =
        status === 'accepted'
          ? 'قبل العميل عرض السعر الخاص بك'
          : 'رفض العميل عرض السعر الخاص بك';
      await this.supabase.from('notifications').insert({
        user_id: quote.provider_id,
        type: `quote_${status}`,
        title: statusTitle,
        message: statusMsg,
        is_read: false,
        data: { quote_id: quote.id, status },
      });
    } catch {
      /* silent */
    }

    return quote;
  }
}
