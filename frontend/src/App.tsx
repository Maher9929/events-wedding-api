import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Suspense, lazy } from 'react';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';

import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import ClientLayout from './layouts/ClientLayout';
import ProviderLayout from './layouts/ProviderLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

const HomePage = lazy(() => import('./pages/HomePage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const ServiceListingPage = lazy(() => import('./pages/ServiceListingPage'));
const ServiceDetailsPage = lazy(() => import('./pages/ServiceDetailsPage'));
const ProviderProfilePage = lazy(() => import('./pages/ProviderProfilePage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));

const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));
const EventsListPage = lazy(() => import('./pages/EventsListPage'));
const CreateEventPage = lazy(() => import('./pages/CreateEventPage'));
const EventDetailsPage = lazy(() => import('./pages/EventDetailsPage'));
const BookingsPage = lazy(() => import('./pages/BookingsPage'));
const BookingDetailsPage = lazy(() => import('./pages/BookingDetailsPage'));
const QuotesPage = lazy(() => import('./pages/QuotesPage'));
const QuoteRequestPage = lazy(() => import('./pages/QuoteRequestPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const BookingCheckoutPage = lazy(() => import('./pages/BookingCheckoutPage'));
const BookingSuccessPage = lazy(() => import('./pages/BookingSuccessPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));

const ProviderDashboardPage = lazy(() => import('./pages/ProviderDashboardPage'));
const ProviderCalendarPage = lazy(() => import('./pages/ProviderCalendarPage'));
const ProviderServicesPage = lazy(() => import('./pages/ProviderServicesPage'));
const ProviderReviewsPage = lazy(() => import('./pages/ProviderReviewsPage'));

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const AdminProvidersPage = lazy(() => import('./pages/AdminProvidersPage'));
const AdminBookingsPage = lazy(() => import('./pages/AdminBookingsPage'));
const AdminEventsPage = lazy(() => import('./pages/AdminEventsPage'));
const AdminCategoriesPage = lazy(() => import('./pages/AdminCategoriesPage'));
const AdminServicesPage = lazy(() => import('./pages/AdminServicesPage'));
const AdminReviewsPage = lazy(() => import('./pages/AdminReviewsPage'));
const AdminQuotesPage = lazy(() => import('./pages/AdminQuotesPage'));
const AdminCommissionsPage = lazy(() => import('./pages/AdminCommissionsPage'));
const AdminAuditLogsPage = lazy(() => import('./pages/AdminAuditLogsPage'));
const ModerationPage = lazy(() => import('./pages/ModerationPage'));

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastContainer />
        <Suspense fallback={<LoadingSpinner fullScreen message="Loading..." />}>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="services" element={<ServiceListingPage />} />
              <Route path="services/:id" element={<ServiceDetailsPage />} />
              <Route path="providers/:id" element={<ProviderProfilePage />} />
              <Route path="legal" element={<LegalPage />} />
            </Route>

            <Route path="/auth" element={<AuthLayout />}>
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignupPage />} />
            </Route>

            <Route
              path="/client"
              element={
                <ProtectedRoute roles={['client']}>
                  <ClientLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<ClientDashboard />} />
              <Route path="events" element={<EventsListPage />} />
              <Route path="events/new" element={<CreateEventPage />} />
              <Route path="events/:id" element={<EventDetailsPage />} />
              <Route path="bookings" element={<BookingsPage />} />
              <Route path="bookings/:id" element={<BookingDetailsPage />} />
              <Route path="quotes" element={<QuotesPage />} />
              <Route path="quotes/request" element={<QuoteRequestPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="payment/:bookingId" element={<PaymentPage />} />
              <Route path="checkout" element={<BookingCheckoutPage />} />
              <Route path="booking-success/:bookingId" element={<BookingSuccessPage />} />
              <Route path="favorites" element={<FavoritesPage />} />
            </Route>

            <Route
              path="/provider"
              element={
                <ProtectedRoute roles={['provider']}>
                  <ProviderLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<ProviderDashboardPage />} />
              <Route path="calendar" element={<ProviderCalendarPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="quotes" element={<QuotesPage />} />
              <Route path="bookings" element={<BookingsPage />} />
              <Route path="bookings/:id" element={<BookingDetailsPage />} />
              <Route path="payment/:bookingId" element={<PaymentPage />} />
              <Route path="services" element={<ProviderServicesPage />} />
              <Route path="reviews" element={<ProviderReviewsPage />} />
            </Route>

            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="providers" element={<AdminProvidersPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
              <Route path="events" element={<AdminEventsPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="services" element={<AdminServicesPage />} />
              <Route path="quotes" element={<AdminQuotesPage />} />
              <Route path="reviews" element={<AdminReviewsPage />} />
              <Route path="commissions" element={<AdminCommissionsPage />} />
              <Route path="audit-logs" element={<AdminAuditLogsPage />} />
              <Route path="moderation" element={<ModerationPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
