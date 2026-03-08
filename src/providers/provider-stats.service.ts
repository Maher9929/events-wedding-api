import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class ProviderStatsService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async getProviderStats(
    providerId: string,
    period?: 'week' | 'month' | 'year',
  ) {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get basic stats
    const [
      bookingsResult,
      revenueResult,
      servicesResult,
      reviewsResult,
      quotesResult,
    ] = await Promise.all([
      // Bookings stats
      this.supabase
        .from('bookings')
        .select('status, created_at, amount')
        .eq('provider_id', providerId)
        .gte('created_at', startDate.toISOString()),
      // Revenue stats
      this.supabase
        .from('payment_records')
        .select('amount, status, created_at')
        .eq(
          'booking_id',
          this.supabase
            .from('bookings')
            .select('id')
            .eq('provider_id', providerId)
            .gte('created_at', startDate.toISOString()),
        )
        .eq('status', 'completed'),
      // Services stats
      this.supabase
        .from('services')
        .select('id, created_at, is_featured')
        .eq('provider_id', providerId),
      // Reviews stats
      this.supabase
        .from('reviews')
        .select('rating, created_at')
        .eq('provider_id', providerId)
        .gte('created_at', startDate.toISOString()),
      // Quotes stats
      this.supabase
        .from('quotes')
        .select('status, created_at, total_amount')
        .eq('provider_id', providerId)
        .gte('created_at', startDate.toISOString()),
    ]);

    const bookings = bookingsResult.data || [];
    const payments = revenueResult.data || [];
    const services = servicesResult.data || [];
    const reviews = reviewsResult.data || [];
    const quotes = quotesResult.data || [];

    // Calculate stats
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(
      (b) => b.status === 'confirmed',
    ).length;
    const completedBookings = bookings.filter(
      (b) => b.status === 'completed',
    ).length;
    const totalRevenue = payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) /
          reviews.length
        : 0;
    const totalServices = services.length;
    const featuredServices = services.filter((s) => s.is_featured).length;
    const pendingQuotes = quotes.filter((q) => q.status === 'sent').length;
    const acceptedQuotes = quotes.filter((q) => q.status === 'accepted').length;

    // Monthly revenue trend
    const monthlyRevenue = this.calculateMonthlyRevenue(payments);

    // Booking status distribution
    const bookingStatusDistribution = {
      pending: bookings.filter((b) => b.status === 'pending').length,
      confirmed: confirmedBookings,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
      completed: completedBookings,
      rejected: bookings.filter((b) => b.status === 'rejected').length,
    };

    // Recent activity
    const recentBookings = bookings
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 5);

    return {
      overview: {
        totalBookings,
        confirmedBookings,
        completedBookings,
        totalRevenue,
        averageRating,
        totalServices,
        featuredServices,
        pendingQuotes,
        acceptedQuotes,
      },
      trends: {
        monthlyRevenue,
        bookingStatusDistribution,
      },
      recentActivity: recentBookings,
      period: period || 'month',
    };
  }

  private calculateMonthlyRevenue(payments: any[]) {
    const revenueByMonth: { [key: string]: number } = {};

    payments.forEach((payment) => {
      const date = new Date(payment.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      revenueByMonth[monthKey] =
        (revenueByMonth[monthKey] || 0) + Number(payment.amount || 0);
    });

    return Object.entries(revenueByMonth)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async getPerformanceMetrics(providerId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [recentBookings, recentReviews, recentQuotes, providerProfile] =
      await Promise.all([
        this.supabase
          .from('bookings')
          .select('status, created_at, amount')
          .eq('provider_id', providerId)
          .gte('created_at', thirtyDaysAgo.toISOString()),
        this.supabase
          .from('reviews')
          .select('rating, created_at')
          .eq('provider_id', providerId)
          .gte('created_at', thirtyDaysAgo.toISOString()),
        this.supabase
          .from('quotes')
          .select('status, created_at, total_amount')
          .eq('provider_id', providerId)
          .gte('created_at', thirtyDaysAgo.toISOString()),
        this.supabase
          .from('providers')
          .select('rating_avg, review_count, created_at')
          .eq('user_id', providerId)
          .single(),
      ]);

    const bookings = recentBookings.data || [];
    const reviews = recentReviews.data || [];
    const quotes = recentQuotes.data || [];
    const profile = providerProfile.data;

    // Calculate conversion rates
    const quoteConversionRate =
      quotes.length > 0
        ? (quotes.filter((q) => q.status === 'accepted').length /
            quotes.length) *
          100
        : 0;

    const bookingConversionRate =
      bookings.length > 0
        ? (bookings.filter((b) => b.status === 'confirmed').length /
            bookings.length) *
          100
        : 0;

    // Response time (mock for now, would come from actual data)
    const averageResponseTime = 24; // hours

    return {
      conversionRates: {
        quoteConversionRate: Math.round(quoteConversionRate * 10) / 10,
        bookingConversionRate: Math.round(bookingConversionRate * 10) / 10,
      },
      performance: {
        averageResponseTime,
        totalEarnings: bookings
          .filter((b) => b.status === 'completed')
          .reduce((sum, b) => sum + Number(b.amount || 0), 0),
        clientSatisfaction: profile?.rating_avg || 0,
      },
      growth: {
        newClients: bookings.length, // Simplified, would track unique clients
        repeatClients: 0, // Would calculate from booking history
      },
    };
  }
}
