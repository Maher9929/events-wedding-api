import { ProvidersService } from './providers.service';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

function createSupabaseMock() {
  let terminalResult: any = { data: null, error: null, count: 0 };
  const chain: any = {};
  chain.from = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.neq = jest.fn(() => chain);
  chain.in = jest.fn(() => chain);
  chain.not = jest.fn(() => chain);
  chain.or = jest.fn(() => chain);
  chain.gte = jest.fn(() => chain);
  chain.lte = jest.fn(() => chain);
  chain.contains = jest.fn(() => chain);
  chain.insert = jest.fn(() => chain);
  chain.update = jest.fn(() => chain);
  chain.delete = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.range = jest.fn(() => chain);
  chain.single = jest.fn();
  chain.maybeSingle = jest.fn();
  chain.then = jest.fn((resolve: any) => resolve(terminalResult));
  chain._setResult = (result: any) => { terminalResult = result; };
  return chain;
}

describe('ProvidersService', () => {
  let service: ProvidersService;
  let supabase: any;

  beforeEach(() => {
    supabase = createSupabaseMock();
    service = new ProvidersService(supabase);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should throw ConflictException when provider already exists', async () => {
      supabase.single.mockResolvedValueOnce({
        data: { id: 'existing' },
        error: null,
      });

      await expect(
        service.create('u1', { company_name: 'Test' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should create provider successfully', async () => {
      const provider = { id: 'p1', company_name: 'Studio X', user_id: 'u1' };

      // existing check — not found
      supabase.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        // insert
        .mockResolvedValueOnce({ data: provider, error: null });

      const result = await service.create('u1', {
        company_name: 'Studio X',
      } as any);
      expect(result.id).toBe('p1');
    });

    it('should throw BadRequestException on insert error', async () => {
      supabase.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        .mockResolvedValueOnce({ data: null, error: { message: 'insert failed' } });

      await expect(
        service.create('u1', { company_name: 'Test' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return provider when found', async () => {
      const provider = { id: 'p1', company_name: 'Studio X' };
      supabase.single.mockResolvedValueOnce({ data: provider, error: null });

      const result = await service.findOne('p1');
      expect(result).toEqual(provider);
    });

    it('should throw NotFoundException when not found', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'not found' },
      });

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── findByUserId ────────────────────────────────────────────────────────

  describe('findByUserId', () => {
    it('should return provider with service counts', async () => {
      const provider = {
        id: 'p1',
        user_id: 'u1',
        services: [
          { id: 's1', is_active: true },
          { id: 's2', is_active: false },
        ],
      };
      supabase.single.mockResolvedValueOnce({ data: provider, error: null });

      const result = await service.findByUserId('u1');
      expect(result).not.toBeNull();
      expect((result as any).total_services).toBe(2);
      expect((result as any).active_services).toBe(1);
    });

    it('should return null when not found', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await service.findByUserId('unknown');
      expect(result).toBeNull();
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should throw ForbiddenException when user is not the owner', async () => {
      supabase.single.mockResolvedValueOnce({
        data: { id: 'p1', user_id: 'other-user' },
        error: null,
      });

      await expect(
        service.update('p1', 'u1', { company_name: 'New' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update provider successfully', async () => {
      const updated = { id: 'p1', company_name: 'Updated', user_id: 'u1' };

      // findOne
      supabase.single
        .mockResolvedValueOnce({
          data: { id: 'p1', user_id: 'u1' },
          error: null,
        })
        // update
        .mockResolvedValueOnce({ data: updated, error: null });

      const result = await service.update('p1', 'u1', {
        company_name: 'Updated',
      } as any);
      expect(result.company_name).toBe('Updated');
    });
  });

  // ─── updateVerification ──────────────────────────────────────────────────

  describe('updateVerification', () => {
    it('should verify a provider', async () => {
      const verified = { id: 'p1', is_verified: true };
      supabase.single.mockResolvedValueOnce({ data: verified, error: null });

      const result = await service.updateVerification('p1', true);
      expect(result.is_verified).toBe(true);
    });

    it('should throw NotFoundException on error', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'not found' },
      });

      await expect(
        service.updateVerification('nonexistent', true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateRating ────────────────────────────────────────────────────────

  describe('updateRating', () => {
    it('should calculate new average correctly', async () => {
      // current: rating_avg=4, review_count=4 → new rating 5
      // expected: (4*4 + 5) / 5 = 4.2
      supabase.single.mockResolvedValueOnce({
        data: { rating_avg: 4, review_count: 4 },
        error: null,
      });

      // The update call ends with .eq('id', providerId) — terminal
      // But the select also chains .eq(), so we need the second .eq() call
      // to resolve. Use _setResult so the await on the update chain resolves.
      supabase._setResult({ error: null });

      await service.updateRating('p1', 5);

      expect(supabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          rating_avg: 4.2,
          review_count: 5,
        }),
      );
    });

    it('should throw NotFoundException when provider not found', async () => {
      supabase.single.mockResolvedValueOnce({ data: null, error: null });

      await expect(service.updateRating('bad', 5)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── findTopRated ────────────────────────────────────────────────────────

  describe('findTopRated', () => {
    it('should return top rated providers', async () => {
      const providers = [{ id: 'p1', rating_avg: 4.9 }];
      supabase.limit.mockResolvedValueOnce({ data: providers, error: null });

      const result = await service.findTopRated(5);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when none exist', async () => {
      supabase.limit.mockResolvedValueOnce({ data: null, error: null });

      const result = await service.findTopRated();
      expect(result).toEqual([]);
    });

    it('should throw on DB error', async () => {
      supabase.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'db error' },
      });

      await expect(service.findTopRated()).rejects.toThrow(BadRequestException);
    });
  });

  // ─── updateByUserId ──────────────────────────────────────────────────────

  describe('updateByUserId', () => {
    it('should throw NotFoundException when provider not found', async () => {
      supabase.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      await expect(
        service.updateByUserId('unknown', { company_name: 'Test' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update provider by user id', async () => {
      const updated = { id: 'p1', company_name: 'Updated' };

      // find provider
      supabase.single
        .mockResolvedValueOnce({ data: { id: 'p1' }, error: null })
        // update
        .mockResolvedValueOnce({ data: updated, error: null });

      const result = await service.updateByUserId('u1', {
        company_name: 'Updated',
      } as any);
      expect(result.company_name).toBe('Updated');
    });
  });
});
