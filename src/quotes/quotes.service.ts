import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { CreateQuoteRequestDto } from './dto/quote-request.dto';
import { Quote } from './entities/quote.entity';
import { QuoteRequest } from './entities/quote-request.entity';
import { MessagesService } from '../messages/messages.service';
import { sanitizeSearch } from '../common/sanitize';

@Injectable()
export class QuotesService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
    private readonly messagesService: MessagesService,
  ) {}

  private async findOrCreateConversation(
    providerUserId: string,
    clientUserId: string,
  ): Promise<string> {
    const sortedIds = [providerUserId, clientUserId].sort();
    const { data: existing } = await this.supabase
      .from('conversations')
      .select('id')
      .contains('participant_ids', sortedIds)
      .maybeSingle();

    if (existing?.id) {
      return existing.id;
    }

    const conversation =
      await this.messagesService.createConversation(sortedIds);
    return conversation.id;
  }

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
      q = q.ilike('notes', `%${sanitizeSearch(search)}%`);
    }

    if (limit !== undefined && offset !== undefined) {
      q = q.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await q;
    if (error) throw new BadRequestException(error.message);
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
    if (providerId === createQuoteDto.client_id) {
      throw new BadRequestException(
        'Provider and client must be different users',
      );
    }

    if (createQuoteDto.quote_request_id) {
      const { data: quoteRequest } = await this.supabase
        .from('quote_requests')
        .select('id, client_id, provider_ids, status, deadline')
        .eq('id', createQuoteDto.quote_request_id)
        .maybeSingle();

      if (!quoteRequest) {
        throw new NotFoundException('Quote request not found');
      }

      if (quoteRequest.client_id !== createQuoteDto.client_id) {
        throw new BadRequestException(
          'Quote request client does not match the quote client',
        );
      }

      if (!quoteRequest.provider_ids?.includes(providerId)) {
        throw new ForbiddenException(
          'Provider is not part of this quote request',
        );
      }

      if (quoteRequest.status !== 'open') {
        throw new BadRequestException(
          'Quotes can only be created for open quote requests',
        );
      }

      if (
        quoteRequest.deadline &&
        new Date(quoteRequest.deadline).getTime() < Date.now()
      ) {
        throw new BadRequestException('Quote request deadline has expired');
      }
    }

    const conversationId = await this.findOrCreateConversation(
      providerId,
      createQuoteDto.client_id,
    );

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
        conversation_id: conversationId,
        quote_request_id: createQuoteDto.quote_request_id,
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

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async createQuoteRequest(
    clientId: string,
    createQuoteRequestDto: CreateQuoteRequestDto,
  ): Promise<QuoteRequest> {
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('id, client_id')
      .eq('id', createQuoteRequestDto.event_id)
      .single();

    if (eventError || !event || event.client_id !== clientId) {
      throw new ForbiddenException(
        'You can only create quote requests for your own events',
      );
    }

    const uniqueProviderIds = [...new Set(createQuoteRequestDto.provider_ids)];
    if (uniqueProviderIds.length === 0) {
      throw new BadRequestException('At least one provider is required');
    }

    const { data, error } = await this.supabase
      .from('quote_requests')
      .insert({
        ...createQuoteRequestDto,
        provider_ids: uniqueProviderIds,
        client_id: clientId,
        status: createQuoteRequestDto.status || 'open',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
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
    if (error) throw new BadRequestException(error.message);
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
      q = q.ilike('notes', `%${sanitizeSearch(search)}%`);
    }

    if (limit !== undefined && offset !== undefined) {
      q = q.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await q;
    if (error) throw new BadRequestException(error.message);
    return { data: data || [], total: count || 0 };
  }

  async send(id: string, providerId: string): Promise<Quote> {
    const { data: existingQuote } = await this.supabase
      .from('quotes')
      .select('id, provider_id, status, valid_until')
      .eq('id', id)
      .eq('provider_id', providerId)
      .maybeSingle();

    if (!existingQuote) {
      throw new NotFoundException('Quote not found or access denied');
    }

    if (existingQuote.status !== 'draft') {
      throw new BadRequestException('Only draft quotes can be sent');
    }

    if (
      existingQuote.valid_until &&
      new Date(existingQuote.valid_until).getTime() < Date.now()
    ) {
      throw new BadRequestException('Expired quotes cannot be sent');
    }

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
        title: 'New quote',
        message: `You have a new quote for ${quote.total_amount} MAD`,
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
      .select('id, valid_until, status, quote_request_id')
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

    if (!['sent'].includes(existing.status)) {
      throw new ForbiddenException(
        'Only sent quotes can be accepted or rejected by the client',
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

    if (status === 'accepted' && quote.quote_request_id) {
      await this.supabase
        .from('quotes')
        .update({ status: 'rejected' })
        .eq('quote_request_id', quote.quote_request_id)
        .neq('id', quote.id)
        .in('status', ['draft', 'sent']);

      await this.supabase
        .from('quote_requests')
        .update({ status: 'closed' })
        .eq('id', quote.quote_request_id);
    }

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
        status === 'accepted' ? 'Quote accepted' : 'Quote rejected';
      const statusMsg =
        status === 'accepted'
          ? 'The client has accepted your quote'
          : 'The client has rejected your quote';
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
