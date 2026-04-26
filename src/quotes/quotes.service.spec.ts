import { QuotesService } from './quotes.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

function createSupabaseMock() {
  const chain: any = {};
  chain.from = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.neq = jest.fn(() => chain);
  chain.in = jest.fn(() => chain);
  chain.or = jest.fn(() => chain);
  chain.ilike = jest.fn(() => chain);
  chain.contains = jest.fn(() => chain);
  chain.insert = jest.fn(() => chain);
  chain.update = jest.fn(() => chain);
  chain.delete = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.range = jest.fn(() => chain);
  chain.single = jest.fn();
  chain.maybeSingle = jest.fn();
  return chain;
}

const mockMessagesService = {
  createConversation: jest.fn().mockResolvedValue({ id: 'conv-1' }),
  sendMessage: jest.fn().mockResolvedValue({}),
};

describe('QuotesService', () => {
  let service: QuotesService;
  let supabase: any;

  beforeEach(() => {
    supabase = createSupabaseMock();
    service = new QuotesService(supabase, mockMessagesService as any);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a quote when found', async () => {
      const quote = { id: 'q1', provider_id: 'p1', client_id: 'c1', status: 'draft' };
      supabase.single.mockResolvedValueOnce({ data: quote, error: null });

      const result = await service.findOne('q1', 'p1');
      expect(result).toEqual(quote);
    });

    it('should throw NotFoundException when quote not found', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'not found' },
      });

      await expect(service.findOne('q1', 'p1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should throw BadRequestException when provider and client are the same', async () => {
      await expect(
        service.create('u1', {
          client_id: 'u1',
          items: [{ description: 'Test', price: 100, quantity: 1 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a quote successfully', async () => {
      const quoteData = {
        id: 'q1',
        provider_id: 'p1',
        client_id: 'c1',
        total_amount: 100,
        status: 'draft',
      };

      // findOrCreateConversation: existing conversation lookup
      supabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'conv-1' },
        error: null,
      });

      // insert → select → single
      supabase.single.mockResolvedValueOnce({ data: quoteData, error: null });

      const result = await service.create('p1', {
        client_id: 'c1',
        items: [{ description: 'Photography', price: 100, quantity: 1 }],
      } as any);

      expect(result.id).toBe('q1');
      expect(result.status).toBe('draft');
    });

    it('should throw NotFoundException when quote_request_id does not exist', async () => {
      // quote request lookup
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(
        service.create('p1', {
          client_id: 'c1',
          quote_request_id: 'nonexistent',
          items: [{ description: 'Test', price: 100, quantity: 1 }],
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findByUser ──────────────────────────────────────────────────────────

  describe('findByUser', () => {
    it('should return quotes for user', async () => {
      const mockQuotes = [{ id: 'q1' }, { id: 'q2' }];
      supabase.order.mockResolvedValueOnce({
        data: mockQuotes,
        error: null,
        count: 2,
      });

      const result = await service.findByUser('u1');
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      // order() returns chain (for further chaining like .eq), then
      // the terminal .eq('status', ...) returns chain, and the final
      // await resolves — so we mock the last call in the chain
      supabase.eq.mockResolvedValueOnce({
        data: [{ id: 'q1', status: 'sent' }],
        error: null,
        count: 1,
      });

      const result = await service.findByUser('u1', 'sent');
      expect(result.data).toHaveLength(1);
      expect(supabase.eq).toHaveBeenCalledWith('status', 'sent');
    });

    it('should throw on DB error', async () => {
      supabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'db error' },
      });

      await expect(service.findByUser('u1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── send ─────────────────────────────────────────────────────────────────

  describe('send', () => {
    it('should throw NotFoundException when quote not found', async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(service.send('q1', 'p1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when quote is not a draft', async () => {
      supabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'q1', provider_id: 'p1', status: 'sent', valid_until: null },
        error: null,
      });

      await expect(service.send('q1', 'p1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when quote is expired', async () => {
      supabase.maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'q1',
          provider_id: 'p1',
          status: 'draft',
          valid_until: new Date(Date.now() - 86400000).toISOString(), // yesterday
        },
        error: null,
      });

      await expect(service.send('q1', 'p1')).rejects.toThrow(BadRequestException);
    });

    it('should send quote successfully', async () => {
      const sentQuote = {
        id: 'q1',
        provider_id: 'p1',
        client_id: 'c1',
        status: 'sent',
        total_amount: 500,
        conversation_id: 'conv-1',
      };

      supabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'q1', provider_id: 'p1', status: 'draft', valid_until: null },
        error: null,
      });
      supabase.single.mockResolvedValueOnce({ data: sentQuote, error: null });
      // notification insert (silent catch)
      supabase.insert.mockResolvedValueOnce({ data: null, error: null });

      const result = await service.send('q1', 'p1');
      expect(result.status).toBe('sent');
      expect(mockMessagesService.sendMessage).toHaveBeenCalled();
    });
  });

  // ─── updateStatus ─────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('should throw NotFoundException when quote not found', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'not found' },
      });

      await expect(
        service.updateStatus('q1', 'c1', 'accepted'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for expired quote on accept', async () => {
      supabase.single.mockResolvedValueOnce({
        data: {
          id: 'q1',
          status: 'sent',
          valid_until: new Date(Date.now() - 86400000).toISOString(),
          quote_request_id: null,
        },
        error: null,
      });

      await expect(
        service.updateStatus('q1', 'c1', 'accepted'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for non-sent quote', async () => {
      supabase.single.mockResolvedValueOnce({
        data: {
          id: 'q1',
          status: 'draft',
          valid_until: null,
          quote_request_id: null,
        },
        error: null,
      });

      await expect(
        service.updateStatus('q1', 'c1', 'accepted'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete a quote', async () => {
      supabase.or.mockResolvedValueOnce({ data: null, error: null });
      await expect(service.remove('q1', 'u1')).resolves.not.toThrow();
    });

    it('should throw NotFoundException on error', async () => {
      supabase.or.mockResolvedValueOnce({
        data: null,
        error: { message: 'not found' },
      });

      await expect(service.remove('q1', 'u1')).rejects.toThrow(NotFoundException);
    });
  });
});
