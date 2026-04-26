import { EventsService } from './events.service';
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
  chain.gte = jest.fn(() => chain);
  chain.lte = jest.fn(() => chain);
  chain.ilike = jest.fn(() => chain);
  chain.contains = jest.fn(() => chain);
  chain.insert = jest.fn(() => chain);
  chain.update = jest.fn(() => chain);
  chain.delete = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.range = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.single = jest.fn();
  chain.maybeSingle = jest.fn();
  return chain;
}

describe('EventsService', () => {
  let service: EventsService;
  let supabase: any;

  beforeEach(() => {
    supabase = createSupabaseMock();
    service = new EventsService(supabase);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create an event successfully', async () => {
      const eventData = {
        id: 'e1',
        title: 'Wedding',
        client_id: 'u1',
        status: 'planning',
        currency: 'MAD',
      };

      supabase.single.mockResolvedValueOnce({ data: eventData, error: null });

      const result = await service.create('u1', {
        title: 'Wedding',
        event_type: 'wedding',
        event_date: '2026-06-01',
      } as any);

      expect(result.id).toBe('e1');
      expect(result.currency).toBe('MAD');
      expect(supabase.from).toHaveBeenCalledWith('events');
    });

    it('should throw BadRequestException on DB error', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'insert failed' },
      });

      await expect(
        service.create('u1', { title: 'Test', event_type: 'wedding' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return an event when found', async () => {
      const event = { id: 'e1', title: 'Wedding', client_id: 'u1' };
      supabase.single.mockResolvedValueOnce({ data: event, error: null });

      const result = await service.findOne('e1');
      expect(result).toEqual(event);
    });

    it('should throw NotFoundException when event not found', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'not found' },
      });

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── findByClient ────────────────────────────────────────────────────────

  describe('findByClient', () => {
    it('should return events for a client', async () => {
      const mockEvents = [
        { id: 'e1', title: 'Wedding' },
        { id: 'e2', title: 'Birthday' },
      ];

      supabase.order.mockResolvedValueOnce({
        data: mockEvents,
        error: null,
        count: 2,
      });

      const result = await service.findByClient('u1');
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should return empty array when no events', async () => {
      supabase.order.mockResolvedValueOnce({
        data: null,
        error: null,
        count: 0,
      });

      const result = await service.findByClient('u1');
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should throw on DB error', async () => {
      supabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'db error' },
      });

      await expect(service.findByClient('u1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── getStats ─────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return stats grouped by type and status', async () => {
      supabase.select.mockResolvedValueOnce({
        data: [
          { event_type: 'wedding', status: 'planning' },
          { event_type: 'wedding', status: 'confirmed' },
          { event_type: 'birthday', status: 'planning' },
        ],
        error: null,
      });

      const result = await service.getStats();
      expect(result.total).toBe(3);
      expect(result.by_type).toEqual({ wedding: 2, birthday: 1 });
      expect(result.by_status).toEqual({ planning: 2, confirmed: 1 });
    });

    it('should return empty stats when no events', async () => {
      supabase.select.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await service.getStats();
      expect(result.total).toBe(0);
      expect(result.by_type).toEqual({});
    });

    it('should throw on DB error', async () => {
      supabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'db error' },
      });

      await expect(service.getStats()).rejects.toThrow(BadRequestException);
    });
  });

  // ─── assertEventOwnership (tested via update/delete) ─────────────────────

  describe('assertEventOwnership (indirect)', () => {
    it('should throw ForbiddenException when user is not the owner', async () => {
      // findOne resolves
      supabase.single.mockResolvedValueOnce({
        data: { id: 'e1', client_id: 'other-user' },
        error: null,
      });

      // update calls assertEventOwnership internally
      await expect(
        service.update('e1', 'u1', { title: 'New title' } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update an event successfully', async () => {
      const updatedEvent = { id: 'e1', title: 'Updated', client_id: 'u1' };

      // findOne (assertEventOwnership)
      supabase.single
        .mockResolvedValueOnce({
          data: { id: 'e1', client_id: 'u1' },
          error: null,
        })
        // update → select → single
        .mockResolvedValueOnce({ data: updatedEvent, error: null });

      const result = await service.update('e1', 'u1', {
        title: 'Updated',
      } as any);
      expect(result.title).toBe('Updated');
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should throw ForbiddenException when not the owner', async () => {
      supabase.single.mockResolvedValueOnce({
        data: { id: 'e1', client_id: 'other-user' },
        error: null,
      });

      await expect(service.remove('e1', 'u1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should delete an event successfully', async () => {
      // Bypass ownership check
      jest
        .spyOn(service as any, 'assertEventOwnership')
        .mockResolvedValue({ id: 'e1', client_id: 'u1' });

      // delete → eq (terminal)
      supabase.eq.mockResolvedValueOnce({ data: null, error: null });

      await expect(service.remove('e1', 'u1')).resolves.not.toThrow();
    });
  });
});
