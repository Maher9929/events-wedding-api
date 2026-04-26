import { PaymentsService } from './payments.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test',
        client_secret: 'cs_test',
        amount: 500000,
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'pi_test',
        status: 'succeeded',
        amount_received: 500000,
        metadata: { booking_id: 'b1', payment_type: 'full' },
      }),
    },
    refunds: {
      create: jest
        .fn()
        .mockResolvedValue({ id: 're_test', status: 'succeeded' }),
    },
    webhooks: { constructEvent: jest.fn() },
    charges: {
      retrieve: jest
        .fn()
        .mockResolvedValue({ receipt_url: 'https://receipt.stripe.com/test' }),
    },
  }));
});

function createSupabaseMock() {
  const chain: any = {};
  chain.from = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.in = jest.fn(() => chain);
  chain.insert = jest.fn(() => chain);
  chain.update = jest.fn(() => chain);
  chain.single = jest.fn();
  chain.maybeSingle = jest.fn();
  return chain;
}

const mockConfig = {
  get: jest.fn(
    (k: string) =>
      ({ STRIPE_SECRET_KEY: 'sk_test', STRIPE_WEBHOOK_SECRET: 'whsec_test' })[
        k
      ],
  ),
};

const mockAuditLogService = {
  log: jest.fn(),
};

describe('PaymentsService', () => {
  let service: PaymentsService;
  let supabase: any;

  beforeEach(() => {
    supabase = createSupabaseMock();
    service = new PaymentsService(
      mockConfig as any,
      supabase,
      mockAuditLogService as any,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPaymentIntent', () => {
    it('should throw NotFoundException when booking not found', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'nf' },
      });
      await expect(service.createPaymentIntent('x', undefined, 5000)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for negative amount', async () => {
      supabase.single.mockResolvedValueOnce({
        data: {
          amount: 5000,
          deposit_amount: 1500,
          balance_amount: 5000,
          payment_status: 'pending',
          status: 'confirmed',
        },
        error: null,
      });
      await expect(service.createPaymentIntent('b1', undefined, -100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create intent for valid full payment', async () => {
      supabase.single.mockResolvedValueOnce({
        data: {
          amount: 5000,
          deposit_amount: 1500,
          balance_amount: 5000,
          payment_status: 'pending',
          status: 'confirmed',
        },
        error: null,
      });
      const result = await service.createPaymentIntent(
        'b1',
        undefined,
        5000,
        'mad',
        'full',
      );
      expect(result).toHaveProperty('clientSecret');
      expect(result).toHaveProperty('paymentIntentId');
    });
  });

  describe('createDepositPaymentIntent', () => {
    it('should throw NotFoundException for missing booking', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'nf' },
      });
      await expect(service.createDepositPaymentIntent('x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if already paid', async () => {
      supabase.single.mockResolvedValueOnce({
        data: {
          deposit_amount: 1500,
          payment_status: 'deposit_paid',
          status: 'confirmed',
        },
        error: null,
      });
      await expect(service.createDepositPaymentIntent('b1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPaymentStatus', () => {
    it('should return status for booking', async () => {
      supabase.single.mockResolvedValueOnce({
        data: {
          payment_status: 'fully_paid',
          payment_intent_ids: ['pi_123'],
          balance_amount: 0,
          amount: 5000,
        },
        error: null,
      });
      const result = await service.getPaymentStatus('b1');
      expect(result.payment_status).toBe('fully_paid');
      expect(result.payment_intent_id).toBe('pi_123');
    });

    it('should return defaults when not found', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'nf' },
      });
      const result = await service.getPaymentStatus('x');
      expect(result.payment_status).toBe('pending');
    });
  });

  describe('refundPayment', () => {
    it('should throw for missing booking', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'nf' },
      });
      await expect(service.refundPayment('x')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if no payment_intent_id', async () => {
      supabase.single.mockResolvedValueOnce({
        data: {
          payment_intent_id: null,
          payment_intent_ids: [],
          amount: 5000,
          payment_status: 'fully_paid',
        },
        error: null,
      });
      await expect(service.refundPayment('b1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject a refund amount above the allowed refundable total', async () => {
      supabase.single.mockResolvedValueOnce({
        data: {
          id: 'b1',
          payment_intent_id: 'pi_123',
          payment_intent_ids: ['pi_123'],
          amount: 5000,
          deposit_amount: 1000,
          balance_amount: 4000,
          payment_status: 'fully_paid',
          booking_date: '2026-08-20T18:00:00Z',
          refund_policy_id: null,
        },
        error: null,
      });
      supabase.in.mockResolvedValueOnce({
        data: [{ payment_type: 'full', amount: 5000, status: 'completed' }],
        error: null,
      });

      await expect(
        service.refundPayment('b1', undefined, 'client reason', 6000),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
