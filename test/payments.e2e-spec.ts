import { INestApplication, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { raw } from 'express';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { InvoiceService } from '../src/payments/invoice.service';
import { PaymentsController } from '../src/payments/payments.controller';
import { PaymentsService } from '../src/payments/payments.service';

describe('PaymentsController (e2e)', () => {
  let app: INestApplication;
  const paymentsService = {
    createPaymentIntent: jest.fn(),
    confirmPayment: jest.fn(),
    refundPaymentAsAdmin: jest.fn(),
    handleWebhook: jest.fn(),
    getPaymentStatus: jest.fn(),
    assertBookingAccess: jest.fn(),
  };
  const invoiceService = {
    generateInvoicePdf: jest.fn(),
  };

  const jwtGuard = {
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        id: req.headers['x-test-user-id'] || 'client-1',
        role: req.headers['x-test-user-role'] || 'client',
        jti: 'test-jti',
      };
      return true;
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: paymentsService },
        { provide: InvoiceService, useValue: invoiceService },
        RolesGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(
      '/payments/webhook',
      raw({ type: '*/*' }),
      (
        req: Request & { rawBody?: Buffer },
        _res: Response,
        next: NextFunction,
      ) => {
        req.rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
        next();
      },
    );
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks providers from creating client payment intents', async () => {
    await request(app.getHttpServer())
      .post('/payments/create-intent/booking-1')
      .set('x-test-user-id', 'provider-1')
      .set('x-test-user-role', 'provider')
      .send({ amount: 1000, currency: 'QAR', paymentType: 'full' })
      .expect(403);

    expect(paymentsService.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('creates payment intents only for authenticated clients', async () => {
    paymentsService.createPaymentIntent.mockResolvedValue({
      clientSecret: 'pi_secret',
    });

    const response = await request(app.getHttpServer())
      .post('/payments/create-intent/booking-1')
      .set('x-test-user-id', 'client-1')
      .set('x-test-user-role', 'client')
      .send({ amount: 1000, currency: 'QAR', paymentType: 'full' })
      .expect(201);

    expect(response.body.clientSecret).toBe('pi_secret');
    expect(paymentsService.createPaymentIntent).toHaveBeenCalledWith(
      'booking-1',
      'client-1',
      1000,
      'QAR',
      'full',
    );
  });

  it('does not let clients refund payments', async () => {
    await request(app.getHttpServer())
      .post('/payments/refund/booking-1')
      .set('x-test-user-id', 'client-1')
      .set('x-test-user-role', 'client')
      .send({ reason: 'requested_by_customer' })
      .expect(403);

    expect(paymentsService.refundPaymentAsAdmin).not.toHaveBeenCalled();
  });

  it('lets admins refund payments', async () => {
    paymentsService.refundPaymentAsAdmin.mockResolvedValue({
      success: true,
    });

    const response = await request(app.getHttpServer())
      .post('/payments/refund/booking-1')
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-role', 'admin')
      .send({ reason: 'duplicate', amount: 500 })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(paymentsService.refundPaymentAsAdmin).toHaveBeenCalledWith(
      'booking-1',
      'admin-1',
      'duplicate',
      500,
    );
  });

  it('confirms payment without mutating status directly in the controller', async () => {
    paymentsService.confirmPayment.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer())
      .post('/payments/confirm/booking-1')
      .set('x-test-user-id', 'client-1')
      .set('x-test-user-role', 'client')
      .send({ paymentIntentId: 'pi_123' })
      .expect(201);

    expect(response.body).toEqual({ success: true });
    expect(paymentsService.confirmPayment).toHaveBeenCalledWith(
      'booking-1',
      'client-1',
      'pi_123',
    );
  });

  it('keeps Stripe webhook public but delegated to signed webhook validation', async () => {
    paymentsService.handleWebhook.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .post('/payments/webhook')
      .set('stripe-signature', 'test-signature')
      .send({ type: 'payment_intent.succeeded' })
      .expect(201);

    const [payload, signature] = paymentsService.handleWebhook.mock.calls[0];
    expect(Buffer.isBuffer(payload)).toBe(true);
    expect(signature).toBe('test-signature');
  });
});
