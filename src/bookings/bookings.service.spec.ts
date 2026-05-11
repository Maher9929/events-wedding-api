import { BookingsService } from './bookings.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

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

const mockAuditLogService = { log: jest.fn() };
const mockProviderContext = {
  getProviderContext: jest
    .fn()
    .mockResolvedValue({ userId: '', providerId: null }),
  assertProviderScope: jest.fn(),
  canAccessBooking: jest.fn().mockResolvedValue(true),
  resolveProviderUserId: jest.fn().mockResolvedValue(''),
};
const mockCommissionService = { upsert: jest.fn(), cancel: jest.fn() };
const mockNotificationService = {
  notify: jest.fn(),
  notifyBoth: jest.fn(),
  notifyPayment: jest.fn(),
  notifyStatusChange: jest.fn(),
};

function createSupabaseFlowMock(results: {
  maybeSingle?: Array<{ data: any; error: any }>;
  single?: Array<{ data: any; error: any }>;
  awaited?: Array<{ data: any; error: any }>;
}) {
  const queues = {
    maybeSingle: [...(results.maybeSingle || [])],
    single: [...(results.single || [])],
    awaited: [...(results.awaited || [])],
  };

  const supabaseMock = {
    builders: [] as any[],
    from: jest.fn((table: string) => {
      const builder: any = {
        table,
        insertPayload: undefined,
        updatePayload: undefined,
      };

      const chain =
        (method: string) =>
        (...args: any[]) => {
          builder[`${method}Calls`].push(args);
          return builder;
        };

      for (const method of [
        'select',
        'eq',
        'neq',
        'in',
        'gte',
        'lt',
        'lte',
        'order',
        'range',
        'limit',
        'delete',
      ]) {
        builder[`${method}Calls`] = [];
        builder[method] = jest.fn(chain(method));
      }

      builder.insert = jest.fn((payload: unknown) => {
        builder.insertPayload = payload;
        return builder;
      });
      builder.update = jest.fn((payload: unknown) => {
        builder.updatePayload = payload;
        return builder;
      });
      builder.maybeSingle = jest.fn(() =>
        Promise.resolve(
          queues.maybeSingle.shift() || { data: null, error: null },
        ),
      );
      builder.single = jest.fn(() =>
        Promise.resolve(queues.single.shift() || { data: null, error: null }),
      );
      builder.then = (
        resolve: (value: { data: any; error: any }) => unknown,
        reject: (reason?: unknown) => unknown,
      ) =>
        Promise.resolve(
          queues.awaited.shift() || { data: null, error: null },
        ).then(resolve, reject);

      supabaseMock.builders.push(builder);
      return builder;
    }),
  };

  return supabaseMock;
}

describe('BookingsService', () => {
  let service: BookingsService;
  let supabase: any;

  beforeEach(() => {
    supabase = createSupabaseMock();
    service = new BookingsService(
      supabase,
      mockAuditLogService as any,
      mockProviderContext as any,
      mockCommissionService as any,
      mockNotificationService as any,
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
      // canAccessBooking → stranger has no access
      mockProviderContext.canAccessBooking.mockResolvedValueOnce(false);

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

  describe('create availability checks', () => {
    const providerProfileId = '11111111-1111-4111-8111-111111111111';
    const providerUserId = '22222222-2222-4222-8222-222222222222';
    const serviceId = '33333333-3333-4333-8333-333333333333';
    const clientId = '44444444-4444-4444-8444-444444444444';

    const baseDto = {
      service_id: serviceId,
      provider_id: providerProfileId,
      booking_date: '2030-06-01T10:00:00.000Z',
      start_time: '10:00',
      end_time: '12:00',
      amount: 1000,
    };

    function createServiceWithFlow(flowSupabase: any) {
      return new BookingsService(
        flowSupabase,
        mockAuditLogService as any,
        mockProviderContext as any,
        mockCommissionService as any,
        mockNotificationService as any,
      );
    }

    it('rejects bookings when provider has a blocked availability slot', async () => {
      const flowSupabase = createSupabaseFlowMock({
        maybeSingle: [
          {
            data: { id: providerProfileId, user_id: providerUserId },
            error: null,
          },
          {
            data: {
              id: serviceId,
              provider_id: providerProfileId,
              base_price: 1000,
              cancellation_policy: null,
            },
            error: null,
          },
        ],
        awaited: [
          {
            data: [
              {
                start_time: '09:00',
                end_time: '11:00',
                is_blocked: true,
                reason: 'Provider blocked this slot',
              },
            ],
            error: null,
          },
        ],
      });
      const flowService = createServiceWithFlow(flowSupabase);

      await expect(flowService.create(clientId, baseDto)).rejects.toThrow(
        ConflictException,
      );
      expect(flowSupabase.from).not.toHaveBeenCalledWith('refund_policies');
      expect(
        flowSupabase.builders.some(
          (builder: any) =>
            builder.table === 'bookings' && builder.insertPayload,
        ),
      ).toBe(false);
    });

    it('rejects bookings when another booking overlaps the requested time', async () => {
      const flowSupabase = createSupabaseFlowMock({
        maybeSingle: [
          {
            data: { id: providerProfileId, user_id: providerUserId },
            error: null,
          },
          {
            data: {
              id: serviceId,
              provider_id: providerProfileId,
              base_price: 1000,
              cancellation_policy: null,
            },
            error: null,
          },
        ],
        awaited: [
          { data: [], error: null },
          {
            data: [
              {
                id: 'existing-booking',
                start_time: '11:30',
                end_time: '13:00',
                status: 'confirmed',
              },
            ],
            error: null,
          },
        ],
      });
      const flowService = createServiceWithFlow(flowSupabase);

      await expect(flowService.create(clientId, baseDto)).rejects.toThrow(
        ConflictException,
      );
      expect(
        flowSupabase.builders.some(
          (builder: any) =>
            builder.table === 'bookings' && builder.insertPayload,
        ),
      ).toBe(false);
    });

    it('stores bookings with provider user id after checking profile availability', async () => {
      const createdBooking = {
        id: 'booking-1',
        client_id: clientId,
        provider_id: providerUserId,
        service_id: serviceId,
        amount: 1000,
        payment_status: 'pending',
      };
      const flowSupabase = createSupabaseFlowMock({
        maybeSingle: [
          {
            data: { id: providerProfileId, user_id: providerUserId },
            error: null,
          },
          {
            data: {
              id: serviceId,
              provider_id: providerProfileId,
              base_price: 1000,
              cancellation_policy: null,
            },
            error: null,
          },
          { data: { id: 'refund-policy-1' }, error: null },
        ],
        awaited: [
          { data: [], error: null },
          { data: [], error: null },
        ],
        single: [{ data: createdBooking, error: null }],
      });
      const flowService = createServiceWithFlow(flowSupabase);

      const result = await flowService.create(clientId, baseDto);

      expect(result.id).toBe('booking-1');
      const bookingInsert = flowSupabase.builders.find(
        (builder: any) => builder.table === 'bookings' && builder.insertPayload,
      );
      expect(bookingInsert.insertPayload.provider_id).toBe(providerUserId);

      const availabilityQuery = flowSupabase.builders.find(
        (builder: any) => builder.table === 'provider_availabilities',
      );
      expect(availabilityQuery.eq).toHaveBeenCalledWith(
        'provider_id',
        providerProfileId,
      );
    });
  });
});
