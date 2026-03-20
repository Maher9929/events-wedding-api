import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from './components/common/ErrorBoundary';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import ClientLayout from './layouts/ClientLayout';
import ProviderLayout from './layouts/ProviderLayout';
import AdminLayout from './layouts/AdminLayout';

// Pages
import HomePage from './pages/HomePage';
import CategoriesPage from './pages/CategoriesPage';
import ServiceListingPage from './pages/ServiceListingPage';
import ServiceDetailsPage from './pages/ServiceDetailsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import BookingCheckoutPage from './pages/BookingCheckoutPage';
import BookingSuccessPage from './pages/BookingSuccessPage';
import ClientDashboard from './pages/ClientDashboard';
import ProviderDashboardPage from './pages/ProviderDashboardPage';
import ProviderCalendarPage from './pages/ProviderCalendarPage';
import AdminDashboard from './pages/AdminDashboard';
import MessagesPage from './pages/MessagesPage';
import EventDetailsPage from './pages/EventDetailsPage';
import CreateEventPage from './pages/CreateEventPage';
import ProfilePage from './pages/ProfilePage';
import EventsListPage from './pages/EventsListPage';
import NotificationsPage from './pages/NotificationsPage';
import BookingsPage from './pages/BookingsPage';
import BookingDetailsPage from './pages/BookingDetailsPage';
import QuotesPage from './pages/QuotesPage';
import QuoteRequestPage from './pages/QuoteRequestPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import PaymentPage from './pages/PaymentPage';
import LegalPage from './pages/LegalPage';
import ModerationPage from './pages/ModerationPage';
import ProviderProfilePage from './pages/ProviderProfilePage';
import ProviderServicesPage from './pages/ProviderServicesPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminProvidersPage from './pages/AdminProvidersPage';
import AdminBookingsPage from './pages/AdminBookingsPage';
import AdminEventsPage from './pages/AdminEventsPage';
import AdminCategoriesPage from './pages/AdminCategoriesPage';
import AdminServicesPage from './pages/AdminServicesPage';
import AdminReviewsPage from './pages/AdminReviewsPage';
import AdminQuotesPage from './pages/AdminQuotesPage';
import AdminCommissionsPage from './pages/AdminCommissionsPage';
import AdminAuditLogsPage from './pages/AdminAuditLogsPage';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastContainer />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="services" element={<ServiceListingPage />} />
            <Route path="services/:id" element={<ServiceDetailsPage />} />
            <Route path="providers/:id" element={<ProviderProfilePage />} />
            <Route path="legal" element={<LegalPage />} />
          </Route>

          {/* Auth Routes */}
          <Route path="/auth" element={<AuthLayout />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
          </Route>

          {/* Protected Client Routes */}
          <Route path="/client" element={
            <ProtectedRoute>
              <ClientLayout />
            </ProtectedRoute>
          }>
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
          </Route>

          {/* Protected Provider Routes */}
          <Route path="/provider" element={
            <ProtectedRoute>
              <ProviderLayout />
            </ProtectedRoute>
          }>
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
            <Route path="reviews" element={<AdminReviewsPage />} />
            <Route path="profile" element={<ProviderProfilePage />} />
          </Route>

          {/* Protected Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
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

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
