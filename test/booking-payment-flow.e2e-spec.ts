import { INestApplication, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { BookingsController } from '../src/bookings/bookings.controller';
import { BookingsService } from '../src/bookings/bookings.service';
import { InvoiceService } from '../src/payments/invoice.service';
import { PaymentsController } from '../src/payments/payments.controller';
import { PaymentsService } from '../src/payments/payments.service';

describe('Booking payment flow (e2e)', () => {
  let app: INestApplication;

  const bookingsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByClient: jest.fn(),
    findByProvider: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
    getStats: jest.fn(),
    getAdminStats: jest.fn(),
    getUnavailableDates: jest.fn(),
    confirmMockPayment: jest.fn(),
  };

  const paymentsService = {
    createDepositPaymentIntent: jest.fn(),
    createBalancePaymentIntent: jest.fn(),
    createFullPaymentIntent: jest.fn(),
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
        provider_id: req.headers['x-test-provider-id'] || null,
        jti: 'test-jti',
      };
      return true;
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BookingsController, PaymentsController],
      providers: [
        { provide: BookingsService, useValue: bookingsService },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: InvoiceService, useValue: invoiceService },
        RolesGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a booking, creates a deposit intent, then confirms payment', async () => {
    bookingsService.create.mockResolvedValue({
      id: 'booking-1',
      client_id: 'client-1',
      provider_id: 'provider-user-1',
      amount: 1000,
      payment_status: 'pending',
    });
    paymentsService.createDepositPaymentIntent.mockResolvedValue({
      clientSecret: 'pi_deposit_secret',
      paymentIntentId: 'pi_deposit',
    });
    paymentsService.confirmPayment.mockResolvedValue(undefined);

    const createResponse = await request(app.getHttpServer())
      .post('/bookings')
      .set('x-test-user-id', 'client-1')
      .set('x-test-user-role', 'client')
      .send({
        service_id: 'service-1',
        provider_id: 'provider-profile-1',
        booking_date: '2030-06-01T12:00:00.000Z',
        amount: 1000,
      })
      .expect(201);

    expect(createResponse.body.id).toBe('booking-1');
    expect(bookingsService.create).toHaveBeenCalledWith(
      'client-1',
      expect.objectContaining({
        provider_id: 'provider-profile-1',
        amount: 1000,
      }),
    );

    const intentResponse = await request(app.getHttpServer())
      .post('/bookings/id/booking-1/pay')
      .set('x-test-user-id', 'client-1')
      .set('x-test-user-role', 'client')
      .send({ paymentType: 'deposit' })
      .expect(201);

    expect(intentResponse.body.clientSecret).toBe('pi_deposit_secret');
    expect(paymentsService.createDepositPaymentIntent).toHaveBeenCalledWith(
      'booking-1',
      'client-1',
    );

    const confirmResponse = await request(app.getHttpServer())
      .post('/payments/confirm/booking-1')
      .set('x-test-user-id', 'client-1')
      .set('x-test-user-role', 'client')
      .send({ paymentIntentId: 'pi_deposit' })
      .expect(201);

    expect(confirmResponse.body).toEqual({ success: true });
    expect(paymentsService.confirmPayment).toHaveBeenCalledWith(
      'booking-1',
      'client-1',
      'pi_deposit',
    );
  });

  it('keeps the legacy booking pay route delegated to full payments by default', async () => {
    paymentsService.createFullPaymentIntent.mockResolvedValue({
      clientSecret: 'pi_full_secret',
      paymentIntentId: 'pi_full',
    });

    const response = await request(app.getHttpServer())
      .post('/bookings/id/booking-1/pay')
      .set('x-test-user-id', 'client-1')
      .set('x-test-user-role', 'client')
      .send({})
      .expect(201);

    expect(response.body.clientSecret).toBe('pi_full_secret');
    expect(paymentsService.createFullPaymentIntent).toHaveBeenCalledWith(
      'booking-1',
      'client-1',
    );
    expect(paymentsService.createPaymentIntent).not.toHaveBeenCalled();
  });
});
