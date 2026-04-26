import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

@Injectable()
export class NotificationsService {
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly sendgridEnabled: boolean;
  private readonly appBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY') || '';
    this.fromEmail =
      this.configService.get<string>('SENDGRID_FROM_EMAIL') ||
      'noreply@dohaevents.com';
    this.fromName =
      this.configService.get<string>('SENDGRID_FROM_NAME') || 'Doha Events';
    this.sendgridEnabled =
      apiKey.startsWith('SG.') && !apiKey.includes('YOUR_');
    this.appBaseUrl =
      this.configService.get<string>('APP_BASE_URL') || 'https://dohaevents.com';
    if (this.sendgridEnabled) {
      sgMail.setApiKey(apiKey);
    }
  }

  async sendEmail(notification: EmailNotification): Promise<void> {
    if (!this.sendgridEnabled) {
      return;
    }
    try {
      await sgMail.send({
        to: notification.to,
        from: { email: this.fromEmail, name: this.fromName },
        subject: notification.subject,
        text: notification.body,
        html: notification.html || notification.body,
      });
    } catch {
      /* silent - email is non-critical */
    }
  }

  /**
   * New booking notification
   */
  async notifyNewBooking(
    providerEmail: string,
    clientName: string,
    serviceName: string,
    bookingDate: string,
  ): Promise<void> {
    await this.sendEmail({
      to: providerEmail,
      subject: 'حجز جديد - Doha Events',
      body: `مرحباً،\n\nلديك حجز جديد من ${clientName} للخدمة ${serviceName} بتاريخ ${bookingDate}.\n\nيرجى تسجيل الدخول لمراجعة التفاصيل.\n\nشكراً،\nفريق Doha Events`,
      html: this.generateBookingEmailHTML(clientName, serviceName, bookingDate),
    });
  }

  /**
   * Booking confirmation notification
   */
  async notifyBookingConfirmed(
    clientEmail: string,
    serviceName: string,
    bookingDate: string,
  ): Promise<void> {
    await this.sendEmail({
      to: clientEmail,
      subject: 'تأكيد الحجز - Doha Events',
      body: `مرحباً،\n\nتم تأكيد حجزك للخدمة ${serviceName} بتاريخ ${bookingDate}.\n\nشكراً لاستخدامك Doha Events!\n\nفريق Doha Events`,
      html: this.generateConfirmationEmailHTML(serviceName, bookingDate),
    });
  }

  /**
   * New quote notification
   */
  async notifyNewQuote(
    clientEmail: string,
    providerName: string,
    serviceName: string,
    amount: number,
  ): Promise<void> {
    await this.sendEmail({
      to: clientEmail,
      subject: 'عرض سعر جديد - Doha Events',
      body: `مرحباً،\n\nلديك عرض سعر جديد من ${providerName} للخدمة ${serviceName} بمبلغ ${amount} ر.ق.\n\nيرجى تسجيل الدخول لمراجعة العرض.\n\nشكراً،\nفريق Doha Events`,
      html: this.generateQuoteEmailHTML(providerName, serviceName, amount),
    });
  }

  /**
   * New message notification
   */
  async notifyNewMessage(
    recipientEmail: string,
    senderName: string,
    messagePreview: string,
  ): Promise<void> {
    await this.sendEmail({
      to: recipientEmail,
      subject: 'رسالة جديدة - Doha Events',
      body: `مرحباً،\n\nلديك رسالة جديدة من ${senderName}:\n\n"${messagePreview}"\n\nيرجى تسجيل الدخول للرد.\n\nشكراً،\nفريق Doha Events`,
      html: this.generateMessageEmailHTML(senderName, messagePreview),
    });
  }

  /**
   * Provider verification notification
   */
  async notifyProviderVerified(
    providerEmail: string,
    companyName: string,
  ): Promise<void> {
    await this.sendEmail({
      to: providerEmail,
      subject: 'تم التحقق من حسابك - Doha Events',
      body: `مرحباً،\n\nتهانينا! تم التحقق من حساب ${companyName} بنجاح.\n\nيمكنك الآن البدء في استقبال الحجوزات.\n\nشكراً،\nفريق Doha Events`,
      html: this.generateVerificationEmailHTML(companyName),
    });
  }

  /**
   * Event reminder notification
   */
  async notifyEventReminder(
    clientEmail: string,
    eventTitle: string,
    eventDate: string,
    daysUntil: number,
  ): Promise<void> {
    await this.sendEmail({
      to: clientEmail,
      subject: `تذكير: ${eventTitle} - Doha Events`,
      body: `مرحباً،\n\nتذكير بأن فعاليتك "${eventTitle}" ستكون بعد ${daysUntil} أيام (${eventDate}).\n\nتأكد من إتمام جميع الترتيبات!\n\nشكراً،\nفريق Doha Events`,
      html: this.generateReminderEmailHTML(eventTitle, eventDate, daysUntil),
    });
  }

  // HTML Email Templates
  private generateBookingEmailHTML(
    clientName: string,
    serviceName: string,
    bookingDate: string,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">حجز جديد</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #374151;">مرحباً،</p>
          <p style="font-size: 16px; color: #374151;">لديك حجز جديد من <strong>${clientName}</strong></p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>الخدمة:</strong> ${serviceName}</p>
            <p style="margin: 10px 0;"><strong>التاريخ:</strong> ${bookingDate}</p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">يرجى تسجيل الدخول لمراجعة التفاصيل الكاملة.</p>
          <a href="${this.appBaseUrl}/vendor/dashboard" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">عرض الحجز</a>
        </div>
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© 2026 Doha Events. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    `;
  }

  private generateConfirmationEmailHTML(
    serviceName: string,
    bookingDate: string,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">✓ تم تأكيد حجزك</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #374151;">مرحباً،</p>
          <p style="font-size: 16px; color: #374151;">تم تأكيد حجزك بنجاح!</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>الخدمة:</strong> ${serviceName}</p>
            <p style="margin: 10px 0;"><strong>التاريخ:</strong> ${bookingDate}</p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">شكراً لاستخدامك Doha Events!</p>
          <a href="${this.appBaseUrl}/client/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">عرض حجوزاتي</a>
        </div>
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© 2026 Doha Events. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    `;
  }

  private generateQuoteEmailHTML(
    providerName: string,
    serviceName: string,
    amount: number,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">عرض سعر جديد</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #374151;">مرحباً،</p>
          <p style="font-size: 16px; color: #374151;">لديك عرض سعر جديد من <strong>${providerName}</strong></p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>الخدمة:</strong> ${serviceName}</p>
            <p style="margin: 10px 0;"><strong>المبلغ:</strong> ${amount} ر.ق</p>
          </div>
          <a href="${this.appBaseUrl}/client/dashboard" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">مراجعة العرض</a>
        </div>
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© 2026 Doha Events. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    `;
  }

  private generateMessageEmailHTML(
    senderName: string,
    messagePreview: string,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">رسالة جديدة</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #374151;">مرحباً،</p>
          <p style="font-size: 16px; color: #374151;">لديك رسالة جديدة من <strong>${senderName}</strong></p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; font-style: italic;">
            "${messagePreview}"
          </div>
          <a href="${this.appBaseUrl}/messages" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">الرد على الرسالة</a>
        </div>
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© 2026 Doha Events. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    `;
  }

  private generateVerificationEmailHTML(companyName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🎉 تم التحقق من حسابك</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #374151;">مرحباً،</p>
          <p style="font-size: 16px; color: #374151;">تهانينا! تم التحقق من حساب <strong>${companyName}</strong> بنجاح.</p>
          <p style="font-size: 14px; color: #6b7280; margin: 20px 0;">يمكنك الآن:</p>
          <ul style="color: #374151;">
            <li>استقبال الحجوزات من العملاء</li>
            <li>إرسال عروض الأسعار</li>
            <li>الظهور في نتائج البحث</li>
            <li>الحصول على شارة "موثق"</li>
          </ul>
          <a href="${this.appBaseUrl}/vendor/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">الذهاب إلى لوحة التحكم</a>
        </div>
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© 2026 Doha Events. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    `;
  }

  private generateReminderEmailHTML(
    eventTitle: string,
    eventDate: string,
    daysUntil: number,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">⏰ تذكير بفعاليتك</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #374151;">مرحباً،</p>
          <p style="font-size: 16px; color: #374151;">تذكير بأن فعاليتك <strong>"${eventTitle}"</strong> ستكون قريباً!</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="font-size: 32px; font-weight: bold; color: #8b5cf6; margin: 0;">${daysUntil}</p>
            <p style="font-size: 14px; color: #6b7280; margin: 5px 0;">أيام متبقية</p>
            <p style="margin: 10px 0;"><strong>التاريخ:</strong> ${eventDate}</p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">تأكد من إتمام جميع الترتيبات!</p>
          <a href="${this.appBaseUrl}/client/events" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">إدارة الفعالية</a>
        </div>
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© 2026 Doha Events. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    `;
  }
}
