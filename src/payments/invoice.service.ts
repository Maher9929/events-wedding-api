import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { DEFAULT_CURRENCY } from '../common/constants';

interface InvoiceProvider {
  id?: string;
  user_id?: string;
  company_name?: string;
  city?: string;
}

interface InvoiceServiceItem {
  id?: string;
  title?: string;
  base_price?: number;
  description?: string;
  providers?: InvoiceProvider;
}

interface InvoiceClient {
  full_name?: string;
  email?: string;
  phone?: string;
}

interface InvoiceBooking {
  id: string;
  provider_id?: string;
  quote_id?: string;
  amount?: number;
  deposit_amount?: number;
  balance_amount?: number;
  platform_fee?: number;
  payment_status?: string;
  booking_date?: string;
  notes?: string;
  services?: InvoiceServiceItem;
  client?: InvoiceClient;
}

@Injectable()
export class InvoiceService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  private async resolveProvider(
    booking: InvoiceBooking,
  ): Promise<InvoiceProvider | undefined> {
    if (booking.services?.providers) {
      return booking.services.providers;
    }

    if (!booking.provider_id) {
      return undefined;
    }

    const { data: provider } = await this.supabase
      .from('providers')
      .select('id, user_id, company_name, city')
      .or(`id.eq.${booking.provider_id},user_id.eq.${booking.provider_id}`)
      .maybeSingle();

    return provider || undefined;
  }

  async generateInvoicePdf(bookingId: string, res: Response): Promise<void> {
    // Fetch booking with relations
    const { data: booking, error } = await this.supabase
      .from('bookings')
      .select(
        `
        *,
        services(id, title, base_price, description, providers(id, company_name, city, user_id)),
        client:user_profiles!bookings_client_id_fkey(id, full_name, email, phone)
      `,
      )
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      throw new NotFoundException('Booking not found');
    }

    const typedBooking = booking as InvoiceBooking;
    const service = typedBooking.services;
    const provider = await this.resolveProvider(typedBooking);
    const client = typedBooking.client;
    const serviceTitle = service?.title || 'Custom quote service';
    const isQuoteBasedBooking = !service?.title && typedBooking.quote_id;
    const currency = DEFAULT_CURRENCY;

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${bookingId.slice(0, 8)}.pdf"`,
    );
    doc.pipe(res);

    // ─── Header ────────────────────────────────────────────────────────────
    doc
      .fillColor('#6366f1')
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('DOHA EVENTS', 50, 50);

    doc
      .fillColor('#1e293b')
      .fontSize(10)
      .font('Helvetica')
      .text('Events & Wedding Marketplace', 50, 85);

    doc
      .fillColor('#6366f1')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('INVOICE', 400, 50, { align: 'right' });

    doc
      .fillColor('#64748b')
      .fontSize(10)
      .font('Helvetica')
      .text(`N° ${bookingId.slice(0, 8).toUpperCase()}`, 400, 80, {
        align: 'right',
      })
      .text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 400, 95, {
        align: 'right',
      });

    // Divider
    doc
      .moveTo(50, 120)
      .lineTo(545, 120)
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .stroke();

    // ─── Billing Info ───────────────────────────────────────────────────────
    doc
      .fillColor('#1e293b')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('BILLED TO:', 50, 140);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#334155')
      .text(client?.full_name || 'Client', 50, 158)
      .text(client?.email || '', 50, 172)
      .text(client?.phone || '', 50, 186);

    doc
      .fillColor('#1e293b')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('PROVIDER:', 300, 140);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#334155')
      .text(provider?.company_name || 'Provider', 300, 158)
      .text(provider?.city || '', 300, 172);

    // ─── Booking Details ────────────────────────────────────────────────────
    doc.moveTo(50, 220).lineTo(545, 220).strokeColor('#e2e8f0').stroke();

    // Table header
    doc.fillColor('#f8fafc').rect(50, 232, 495, 24).fill();

    doc
      .fillColor('#475569')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('SERVICE', 60, 239)
      .text('BOOKING DATE', 220, 239)
      .text('PAYMENT STATUS', 360, 239)
      .text('AMOUNT', 480, 239);

    doc.moveTo(50, 256).lineTo(545, 256).strokeColor('#e2e8f0').stroke();

    // Table row
    const paymentStatusMap: Record<string, string> = {
      pending: 'Pending',
      deposit_paid: 'Deposit paid',
      fully_paid: 'Fully paid',
      refunded: 'Refunded',
    };

    doc
      .fillColor('#1e293b')
      .fontSize(10)
      .font('Helvetica')
      .text(serviceTitle, 60, 265, { width: 150 })
      .text(
        booking.booking_date
          ? new Date(booking.booking_date).toLocaleDateString('fr-FR')
          : '-',
        220,
        265,
      )
      .text(
        paymentStatusMap[booking.payment_status] || booking.payment_status,
        360,
        265,
      )
      .text(`${Number(booking.amount || 0).toFixed(2)} ${currency}`, 480, 265);

    if (isQuoteBasedBooking) {
      doc
        .fillColor('#64748b')
        .fontSize(8)
        .text(
          `Quote #${typedBooking.quote_id?.slice(0, 8).toUpperCase()}`,
          60,
          287,
          { width: 150 },
        );
    }

    // ─── Totals ─────────────────────────────────────────────────────────────
    doc.moveTo(50, 300).lineTo(545, 300).strokeColor('#e2e8f0').stroke();

    const grossAmount = Number(booking.amount || 0);
    const depositAmount = Number(booking.deposit_amount || 0);
    const balanceAmount = Number(booking.balance_amount || 0);
    const platformFee = Number(booking.platform_fee || 0);
    const platformFeeRate =
      grossAmount > 0 ? ((platformFee / grossAmount) * 100).toFixed(1) : '0.0';

    doc
      .fillColor('#334155')
      .fontSize(10)
      .font('Helvetica')
      .text('Subtotal:', 380, 315)
      .text(`${grossAmount.toFixed(2)} ${currency}`, 480, 315);

    if (platformFee > 0) {
      doc
        .text(`Platform fee (${platformFeeRate}%):`, 380, 330)
        .text(`${platformFee.toFixed(2)} ${currency}`, 480, 330);
    }

    if (depositAmount > 0) {
      const y = platformFee > 0 ? 345 : 330;
      doc
        .fillColor('#334155')
        .fontSize(10)
        .font('Helvetica')
        .text('Deposit:', 380, y)
        .text(`${depositAmount.toFixed(2)} ${currency}`, 480, y);
    }

    if (balanceAmount > 0 && booking.payment_status !== 'fully_paid') {
      const y = platformFee > 0 ? 360 : depositAmount > 0 ? 345 : 330;
      doc
        .fillColor('#334155')
        .fontSize(10)
        .font('Helvetica')
        .text('Balance remaining:', 380, y)
        .text(`${balanceAmount.toFixed(2)} ${currency}`, 480, y);
    }

    const totalY =
      platformFee > 0
        ? depositAmount > 0 || balanceAmount > 0
          ? 380
          : 350
        : depositAmount > 0 || balanceAmount > 0
          ? 365
          : 335;

    doc
      .fillColor('#6366f1')
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('TOTAL:', 380, totalY)
      .text(`${grossAmount.toFixed(2)} ${currency}`, 480, totalY);

    // ─── Notes ──────────────────────────────────────────────────────────────
    if (booking.notes) {
      doc.moveTo(50, 395).lineTo(545, 395).strokeColor('#e2e8f0').stroke();

      doc
        .fillColor('#475569')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Notes:', 50, 410);
      doc
        .font('Helvetica')
        .fillColor('#64748b')
        .fontSize(9)
        .text(booking.notes, 50, 425, { width: 495 });
    }

    // ─── Footer ─────────────────────────────────────────────────────────────
    doc.moveTo(50, 750).lineTo(545, 750).strokeColor('#e2e8f0').stroke();

    doc
      .fillColor('#94a3b8')
      .fontSize(8)
      .font('Helvetica')
      .text(
        'DOHA EVENTS — Wedding & Events Marketplace | Auto-generated document',
        50,
        760,
        { align: 'center', width: 495 },
      );

    doc.end();
  }
}
