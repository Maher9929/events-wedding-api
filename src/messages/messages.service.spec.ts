import { MessagesService } from './messages.service';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

function createSupabaseMock() {
  const chain: any = {};
  chain.from = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.neq = jest.fn(() => chain);
  chain.is = jest.fn(() => chain);
  chain.in = jest.fn(() => chain);
  chain.contains = jest.fn(() => chain);
  chain.insert = jest.fn(() => chain);
  chain.update = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.single = jest.fn();
  chain.maybeSingle = jest.fn();
  return chain;
}

const gatewayMock = {
  emitNewMessage: jest.fn(),
  emitNotification: jest.fn(),
  emitConversationUpdate: jest.fn(),
} as any;

describe('MessagesService', () => {
  let service: MessagesService;
  let supabase: any;

  beforeEach(() => {
    supabase = createSupabaseMock();
    service = new MessagesService(supabase, gatewayMock);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── createConversation ────────────────────────────────────────────────

  describe('createConversation', () => {
    it('should create a conversation successfully', async () => {
      const convo = { id: 'conv-1', participant_ids: ['u1', 'u2'] };
      supabase.maybeSingle.mockResolvedValueOnce({ data: convo, error: null });

      const result = await service.createConversation(['u1', 'u2']);
      expect(result.id).toBe('conv-1');
      expect(supabase.from).toHaveBeenCalledWith('conversations');
    });

    it('should sort participant ids', async () => {
      const convo = { id: 'conv-1', participant_ids: ['a', 'z'] };
      supabase.maybeSingle.mockResolvedValueOnce({ data: convo, error: null });

      await service.createConversation(['z', 'a']);
      expect(supabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({ participant_ids: ['a', 'z'] }),
      );
    });

    it('should throw InternalServerErrorException on DB error', async () => {
      supabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'db error' },
      });

      await expect(service.createConversation(['u1', 'u2'])).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException when no data returned', async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(service.createConversation(['u1', 'u2'])).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ─── getConversations ──────────────────────────────────────────────────

  describe('getConversations', () => {
    it('should return empty array for falsy userId', async () => {
      const result = await service.getConversations('');
      expect(result).toEqual([]);
    });

    it('should throw on DB error', async () => {
      supabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'db error' },
      });

      await expect(service.getConversations('u1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ─── getMessages ───────────────────────────────────────────────────────

  describe('getMessages', () => {
    it('should return empty array for falsy conversationId', async () => {
      const result = await service.getMessages('', 'u1');
      expect(result).toEqual([]);
    });
  });

  // ─── sendMessage ───────────────────────────────────────────────────────

  describe('sendMessage', () => {
    it('should throw BadRequestException when senderId is empty', async () => {
      await expect(
        service.sendMessage('', { content: 'hello', conversation_id: 'c1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when content is empty', async () => {
      await expect(
        service.sendMessage('u1', { content: '   ', conversation_id: 'c1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no conversation_id or recipient_id', async () => {
      await expect(
        service.sendMessage('u1', { content: 'hello' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── markConversationRead ──────────────────────────────────────────────

  describe('markConversationRead', () => {
    it('should throw NotFoundException when conversation not found', async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(
        service.markConversationRead('conv-1', 'u1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should mark as read successfully', async () => {
      // getConversationForUser
      supabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'conv-1', participant_ids: ['u1', 'u2'] },
        error: null,
      });

      // update chain terminal
      supabase.is.mockResolvedValueOnce({ error: null });

      const result = await service.markConversationRead('conv-1', 'u1');
      expect(result).toEqual({ success: true });
    });

    it('should throw on update error', async () => {
      supabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'conv-1', participant_ids: ['u1', 'u2'] },
        error: null,
      });

      supabase.is.mockResolvedValueOnce({
        error: { message: 'update failed' },
      });

      await expect(
        service.markConversationRead('conv-1', 'u1'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
