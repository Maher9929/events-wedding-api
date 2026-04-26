import { NotificationsService } from './notifications.service';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
}));

function createConfigService(overrides: Record<string, string> = {}): ConfigService {
  const defaults: Record<string, string> = {
    SENDGRID_API_KEY: '',
    SENDGRID_FROM_EMAIL: 'test@dohaevents.com',
    SENDGRID_FROM_NAME: 'Doha Events Test',
    APP_BASE_URL: 'https://test.dohaevents.com',
  };
  const values = { ...defaults, ...overrides };
  return { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
}

describe('NotificationsService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── SendGrid disabled ─────────────────────────────────────────────────

  describe('when SendGrid is disabled', () => {
    let service: NotificationsService;

    beforeEach(() => {
      service = new NotificationsService(createConfigService());
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should not call sgMail.send', async () => {
      await service.sendEmail({
        to: 'user@test.com',
        subject: 'Test',
        body: 'Hello',
      });

      expect(sgMail.send).not.toHaveBeenCalled();
    });

    it('notifyNewBooking should not throw', async () => {
      await expect(
        service.notifyNewBooking('prov@test.com', 'Ali', 'DJ', '2026-06-01'),
      ).resolves.not.toThrow();
    });

    it('notifyBookingConfirmed should not throw', async () => {
      await expect(
        service.notifyBookingConfirmed('client@test.com', 'Photography', '2026-06-01'),
      ).resolves.not.toThrow();
    });

    it('notifyNewQuote should not throw', async () => {
      await expect(
        service.notifyNewQuote('client@test.com', 'Studio X', 'Video', 5000),
      ).resolves.not.toThrow();
    });

    it('notifyNewMessage should not throw', async () => {
      await expect(
        service.notifyNewMessage('user@test.com', 'Ali', 'Hello there'),
      ).resolves.not.toThrow();
    });

    it('notifyProviderVerified should not throw', async () => {
      await expect(
        service.notifyProviderVerified('prov@test.com', 'Studio X'),
      ).resolves.not.toThrow();
    });

    it('notifyEventReminder should not throw', async () => {
      await expect(
        service.notifyEventReminder('client@test.com', 'My Wedding', '2026-06-01', 7),
      ).resolves.not.toThrow();
    });
  });

  // ─── SendGrid enabled ──────────────────────────────────────────────────

  describe('when SendGrid is enabled', () => {
    let service: NotificationsService;

    beforeEach(() => {
      service = new NotificationsService(
        createConfigService({ SENDGRID_API_KEY: 'SG.valid_key_here' }),
      );
    });

    it('should set the API key', () => {
      expect(sgMail.setApiKey).toHaveBeenCalledWith('SG.valid_key_here');
    });

    it('sendEmail should call sgMail.send with correct params', async () => {
      await service.sendEmail({
        to: 'user@test.com',
        subject: 'Test Subject',
        body: 'Test Body',
      });

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: 'Test Subject',
          text: 'Test Body',
        }),
      );
    });

    it('notifyNewBooking should send email', async () => {
      await service.notifyNewBooking('prov@test.com', 'Ali', 'DJ', '2026-06-01');
      expect(sgMail.send).toHaveBeenCalledTimes(1);
      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'prov@test.com',
        }),
      );
    });

    it('notifyBookingConfirmed should send email', async () => {
      await service.notifyBookingConfirmed('client@test.com', 'Photography', '2026-06-01');
      expect(sgMail.send).toHaveBeenCalledTimes(1);
    });

    it('notifyNewQuote should send email with amount', async () => {
      await service.notifyNewQuote('client@test.com', 'Studio X', 'Video', 5000);
      expect(sgMail.send).toHaveBeenCalledTimes(1);
    });

    it('notifyNewMessage should send email', async () => {
      await service.notifyNewMessage('user@test.com', 'Ali', 'Hello there');
      expect(sgMail.send).toHaveBeenCalledTimes(1);
    });

    it('notifyProviderVerified should send email', async () => {
      await service.notifyProviderVerified('prov@test.com', 'Studio X');
      expect(sgMail.send).toHaveBeenCalledTimes(1);
    });

    it('notifyEventReminder should send email', async () => {
      await service.notifyEventReminder('client@test.com', 'My Wedding', '2026-06-01', 7);
      expect(sgMail.send).toHaveBeenCalledTimes(1);
    });

    it('should silently catch send errors', async () => {
      (sgMail.send as jest.Mock).mockRejectedValueOnce(new Error('SendGrid error'));

      await expect(
        service.sendEmail({ to: 'user@test.com', subject: 'Test', body: 'Body' }),
      ).resolves.not.toThrow();
    });
  });
});
