import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { Response } from 'express';
import PDFDocument from 'pdfkit';

@Injectable()
export class InvoiceService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

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

    const service = booking.services;
    const provider = service?.providers;
    const client = booking.client;

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
      .text('DOUSHA', 50, 50);

    doc
      .fillColor('#1e293b')
      .fontSize(10)
      .font('Helvetica')
      .text('Plateforme Événements & Mariages', 50, 85);

    doc
      .fillColor('#6366f1')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('FACTURE', 400, 50, { align: 'right' });

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
      .text('FACTURÉ À:', 50, 140);
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
      .text('PRESTATAIRE:', 300, 140);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#334155')
      .text(provider?.company_name || 'Prestataire', 300, 158)
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
      .text('DATE RÉSERVATION', 220, 239)
      .text('STATUT PAIEMENT', 360, 239)
      .text('MONTANT', 480, 239);

    doc.moveTo(50, 256).lineTo(545, 256).strokeColor('#e2e8f0').stroke();

    // Table row
    const paymentStatusMap: Record<string, string> = {
      pending: 'En attente',
      paid: 'Payé',
      refunded: 'Remboursé',
    };

    doc
      .fillColor('#1e293b')
      .fontSize(10)
      .font('Helvetica')
      .text(service?.title || 'Service', 60, 265, { width: 150 })
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
      .text(`${Number(booking.amount || 0).toFixed(2)} MAD`, 480, 265);

    // ─── Totals ─────────────────────────────────────────────────────────────
    doc.moveTo(50, 300).lineTo(545, 300).strokeColor('#e2e8f0').stroke();

    const grossAmount = Number(booking.amount || 0);
    const platformFee = Number(booking.platform_fee || 0);

    doc
      .fillColor('#334155')
      .fontSize(10)
      .font('Helvetica')
      .text('Sous-total:', 380, 315)
      .text(`${grossAmount.toFixed(2)} MAD`, 480, 315);

    if (platformFee > 0) {
      doc
        .text('Frais de plateforme (5%):', 380, 330)
        .text(`${platformFee.toFixed(2)} MAD`, 480, 330);
    }

    doc
      .fillColor('#6366f1')
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('TOTAL:', 380, platformFee > 0 ? 350 : 335)
      .text(`${grossAmount.toFixed(2)} MAD`, 480, platformFee > 0 ? 350 : 335);

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
        'DOUSHA — Plateforme Événements & Mariages | Document généré automatiquement',
        50,
        760,
        { align: 'center', width: 495 },
      );

    doc.end();
  }
}
