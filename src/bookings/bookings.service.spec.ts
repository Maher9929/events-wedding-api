import { BookingsService } from './bookings.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: { create: jest.fn(), retrieve: jest.fn() },
  }));
});

function createSupabaseMock() {
  const chain: any = {};
  chain.from = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.neq = jest.fn(() => chain);
  chain.in = jest.fn(() => chain);
  chain.gte = jest.fn(() => chain);
  chain.lt = jest.fn(() => chain);
  chain.lte = jest.fn(() => chain);
  chain.insert = jest.fn(() => chain);
  chain.update = jest.fn(() => chain);
  chain.delete = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.range = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.single = jest.fn();
  chain.maybeSingle = jest.fn();
  chain.rpc = jest.fn();
  return chain;
}

const mockConfig = {
  get: jest.fn((k: string) => {
    const map: Record<string, string> = {
      STRIPE_SECRET_KEY: 'sk_test',
      COMMISSION_RATE: '0.1',
    };
    return map[k];
  }),
};

const mockAuditLogService = { log: jest.fn() };

describe('BookingsService', () => {
  let service: BookingsService;
  let supabase: any;

  beforeEach(() => {
    supabase = createSupabaseMock();
    service = new BookingsService(
      supabase,
      mockConfig as any,
      mockAuditLogService as any,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findOne ─────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('should return booking when found', async () => {
      const mockBooking = {
        id: 'b1',
        client_id: 'u1',
        provider_id: 'p1',
        status: 'pending',
      };
      supabase.single.mockResolvedValueOnce({ data: mockBooking, error: null });

      const result = await service.findOne('b1');
      expect(result).toEqual({ ...mockBooking, currency: 'QAR' });
      expect(supabase.from).toHaveBeenCalledWith('bookings');
    });

    it('should throw NotFoundException when booking not found', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'not found' },
      });

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when user cannot access booking', async () => {
      const mockBooking = {
        id: 'b1',
        client_id: 'u1',
        provider_id: 'p1',
        status: 'pending',
      };
      supabase.single.mockResolvedValueOnce({ data: mockBooking, error: null });
      // canAccessBooking → getProviderContext → no provider for stranger
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(service.findOne('b1', 'stranger')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── updateStatus ────────────────────────────────────────────────────────
  describe('updateStatus', () => {
    // Helper: mock findOne(id, userId) + getProviderContext
    // findOne calls: single (booking), maybeSingle (canAccessBooking→getProviderContext)
    // updateStatus then calls: maybeSingle again (getProviderContext)
    function mockUpdateStatusSetup(booking: any, providerRecord: any) {
      supabase.single.mockResolvedValueOnce({ data: booking, error: null });
      // canAccessBooking → getProviderContext
      supabase.maybeSingle.mockResolvedValueOnce({
        data: providerRecord,
        error: null,
      });
      // updateStatus → getProviderContext (same user, same result)
      supabase.maybeSingle.mockResolvedValueOnce({
        data: providerRecord,
        error: null,
      });
    }

    it('should reject confirmation by non-provider', async () => {
      const booking = {
        id: 'b1',
        client_id: 'client1',
        provider_id: 'prov1',
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      mockUpdateStatusSetup(booking, null); // client1 is not a provider

      await expect(
        service.updateStatus('b1', 'client1', { status: 'confirmed' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject cancellation by non-client (provider)', async () => {
      const booking = {
        id: 'b1',
        client_id: 'client1',
        provider_id: 'prov1',
        status: 'pending',
        created_at: new Date().toISOString(),
        booking_date: '2030-01-01',
      };
      mockUpdateStatusSetup(booking, { id: 'prov1' }); // prov1 is a provider

      await expect(
        service.updateStatus('b1', 'prov1', {
          status: 'cancelled',
          cancellation_reason: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject confirming already completed booking', async () => {
      const booking = {
        id: 'b1',
        client_id: 'client1',
        provider_id: 'prov1',
        status: 'completed',
        created_at: new Date().toISOString(),
      };
      mockUpdateStatusSetup(booking, { id: 'prov1' });

      await expect(
        service.updateStatus('b1', 'prov1', { status: 'confirmed' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require cancellation_reason when cancelling', async () => {
      const booking = {
        id: 'b1',
        client_id: 'client1',
        provider_id: 'prov1',
        status: 'pending',
        booking_date: '2030-01-01',
        created_at: new Date().toISOString(),
      };
      mockUpdateStatusSetup(booking, null); // client access

      await expect(
        service.updateStatus('b1', 'client1', { status: 'cancelled' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject completing a non-confirmed booking', async () => {
      const booking = {
        id: 'b1',
        client_id: 'client1',
        provider_id: 'prov1',
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      mockUpdateStatusSetup(booking, { id: 'prov1' });

      await expect(
        service.updateStatus('b1', 'prov1', { status: 'completed' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
