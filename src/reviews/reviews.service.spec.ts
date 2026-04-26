import { ReviewsService } from './reviews.service';
import {
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

function createSupabaseMock() {
  const chain: any = {};
  chain.from = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.neq = jest.fn(() => chain);
  chain.in = jest.fn(() => chain);
  chain.ilike = jest.fn(() => chain);
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

describe('ReviewsService', () => {
  let service: ReviewsService;
  let supabase: any;

  beforeEach(() => {
    supabase = createSupabaseMock();
    service = new ReviewsService(supabase);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should throw ForbiddenException when service not found', async () => {
      supabase.single.mockResolvedValueOnce({ data: null, error: null });

      await expect(
        service.create('u1', { service_id: 'svc1', rating: 5, comment: 'Great' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when no completed booking exists', async () => {
      // service lookup
      supabase.single.mockResolvedValueOnce({
        data: { provider_id: 'p1' },
        error: null,
      });
      // pastBookings → limit() returns data
      supabase.limit.mockResolvedValueOnce({ data: [], error: null });

      await expect(
        service.create('u1', { service_id: 'svc1', rating: 5, comment: 'Great' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when already reviewed', async () => {
      // service lookup
      supabase.single
        .mockResolvedValueOnce({ data: { provider_id: 'p1' }, error: null });
      // pastBookings
      supabase.limit.mockResolvedValueOnce({
        data: [{ id: 'b1' }],
        error: null,
      });
      // existing review check
      supabase.single.mockResolvedValueOnce({
        data: { id: 'existing-review' },
        error: null,
      });

      await expect(
        service.create('u1', { service_id: 'svc1', rating: 5, comment: 'Great' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create review successfully', async () => {
      const reviewData = {
        id: 'r1',
        service_id: 'svc1',
        client_id: 'u1',
        rating: 5,
        comment: 'Great',
      };

      // Spy on updateProviderRating to avoid deep mock chaining
      jest
        .spyOn(service as any, 'updateProviderRating')
        .mockResolvedValue(undefined);

      // 1. service lookup → .single()
      supabase.single
        .mockResolvedValueOnce({ data: { provider_id: 'p1' }, error: null })
        // 3. existing review check → .single() — not found
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        // 4. insert → select → .single()
        .mockResolvedValueOnce({ data: reviewData, error: null });

      // 2. pastBookings → .limit()
      supabase.limit.mockResolvedValueOnce({
        data: [{ id: 'b1' }],
        error: null,
      });

      const result = await service.create('u1', {
        service_id: 'svc1',
        rating: 5,
        comment: 'Great',
      });

      expect(result.id).toBe('r1');
      expect(result.rating).toBe(5);
      expect((service as any).updateProviderRating).toHaveBeenCalledWith('svc1');
    });
  });

  // ─── getAverageRating ──────────────────────────────────────────────────────

  describe('getAverageRating', () => {
    it('should return 0 average when no reviews', async () => {
      supabase.eq.mockResolvedValueOnce({ data: [], error: null });

      const result = await service.getAverageRating('svc1');
      expect(result).toEqual({ average: 0, count: 0 });
    });

    it('should compute correct average', async () => {
      supabase.eq.mockResolvedValueOnce({
        data: [{ rating: 4 }, { rating: 5 }, { rating: 3 }],
        error: null,
      });

      const result = await service.getAverageRating('svc1');
      expect(result.count).toBe(3);
      expect(result.average).toBe(4); // (4+5+3)/3 = 4.0
    });

    it('should throw on DB error', async () => {
      supabase.eq.mockResolvedValueOnce({
        data: null,
        error: { message: 'db error' },
      });

      await expect(service.getAverageRating('svc1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── findByService ────────────────────────────────────────────────────────

  describe('findByService', () => {
    it('should return reviews for a service', async () => {
      const mockReviews = [
        { id: 'r1', rating: 5, comment: 'Great' },
        { id: 'r2', rating: 4, comment: 'Good' },
      ];
      supabase.order.mockResolvedValueOnce({ data: mockReviews, error: null });

      const result = await service.findByService('svc1');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no reviews', async () => {
      supabase.order.mockResolvedValueOnce({ data: null, error: null });
      const result = await service.findByService('svc1');
      expect(result).toEqual([]);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should throw ForbiddenException when not the author', async () => {
      supabase.single.mockResolvedValueOnce({
        data: { client_id: 'other-user', service_id: 'svc1' },
        error: null,
      });

      await expect(service.remove('r1', 'u1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when review not found', async () => {
      supabase.single.mockResolvedValueOnce({ data: null, error: null });

      await expect(service.remove('r1', 'u1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── reportReview ─────────────────────────────────────────────────────────

  describe('reportReview', () => {
    it('should report a review successfully', async () => {
      supabase.eq.mockResolvedValueOnce({ data: null, error: null });

      const result = await service.reportReview('r1', 'u1', 'inappropriate');
      expect(result).toEqual({ success: true });
    });

    it('should throw on DB error', async () => {
      supabase.eq.mockResolvedValueOnce({
        data: null,
        error: { message: 'db error' },
      });

      await expect(
        service.reportReview('r1', 'u1', 'spam'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
