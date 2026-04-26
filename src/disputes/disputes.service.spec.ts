import { DisputesService } from './disputes.service';
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
  chain.insert = jest.fn(() => chain);
  chain.update = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.single = jest.fn();
  chain.maybeSingle = jest.fn();
  return chain;
}

describe('DisputesService', () => {
  let service: DisputesService;
  let supabase: any;

  beforeEach(() => {
    supabase = createSupabaseMock();
    service = new DisputesService(supabase);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ──────────────────────────────────────────────────────────────
  describe('create', () => {
    it('should throw NotFoundException when booking not found', async () => {
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(
        service.create('u1', {
          booking_id: 'nonexistent',
          reason: 'quality_issue',
          description: 'Bad quality',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the client', async () => {
      supabase.maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'b1',
          client_id: 'other_user',
          provider_id: 'p1',
          status: 'confirmed',
        },
        error: null,
      });

      await expect(
        service.create('u1', {
          booking_id: 'b1',
          reason: 'quality_issue',
          description: 'Bad quality',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for pending booking', async () => {
      supabase.maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'b1',
          client_id: 'u1',
          provider_id: 'p1',
          status: 'pending',
        },
        error: null,
      });

      await expect(
        service.create('u1', {
          booking_id: 'b1',
          reason: 'quality_issue',
          description: 'Bad quality',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if active dispute already exists', async () => {
      // Booking lookup
      supabase.maybeSingle
        .mockResolvedValueOnce({
          data: {
            id: 'b1',
            client_id: 'u1',
            provider_id: 'p1',
            status: 'confirmed',
          },
          error: null,
        })
        // Existing dispute check
        .mockResolvedValueOnce({
          data: { id: 'd_existing' },
          error: null,
        });

      await expect(
        service.create('u1', {
          booking_id: 'b1',
          reason: 'quality_issue',
          description: 'Bad quality',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create dispute successfully', async () => {
      const disputeData = {
        id: 'd1',
        booking_id: 'b1',
        opened_by: 'u1',
        reason: 'quality_issue',
        description: 'Bad quality',
        evidence_urls: [],
        status: 'open',
      };

      // Booking lookup
      supabase.maybeSingle
        .mockResolvedValueOnce({
          data: {
            id: 'b1',
            client_id: 'u1',
            provider_id: 'p1',
            status: 'confirmed',
          },
          error: null,
        })
        // No existing dispute
        .mockResolvedValueOnce({ data: null, error: null });

      // Insert dispute → .select() → .single()
      supabase.single.mockResolvedValueOnce({ data: disputeData, error: null });

      const result = await service.create('u1', {
        booking_id: 'b1',
        reason: 'quality_issue',
        description: 'Bad quality',
      });

      expect(result.id).toBe('d1');
      expect(result.status).toBe('open');
      expect(supabase.from).toHaveBeenCalledWith('disputes');
    });
  });

  // ─── getMyDisputes ───────────────────────────────────────────────────────
  describe('getMyDisputes', () => {
    it('should return disputes for user', async () => {
      const mockDisputes = [
        { id: 'd1', opened_by: 'u1', status: 'open' },
        { id: 'd2', opened_by: 'u1', status: 'resolved' },
      ];

      // order() is the terminal call here — it returns the result
      supabase.order.mockResolvedValueOnce({ data: mockDisputes, error: null });

      const result = await service.getMyDisputes('u1');
      expect(result).toHaveLength(2);
    });

    it('should throw on DB error', async () => {
      supabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'db error' },
      });

      await expect(service.getMyDisputes('u1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
