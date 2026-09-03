import { createBrowserRouter, Navigate } from 'react-router';
import { Root } from './Root';
import { RouteErrorBoundary } from './components/error/RouteErrorBoundary';
import { PublicSiteLayout } from './components/layout/PublicSiteLayout';
import HomePage from './pages/HomePage';
import StudioPage from './pages/StudioPage';
import GuidelinesPage from './pages/GuidelinesPage';
import PricingPage from './pages/PricingPage';
import ServicesPage from './pages/ServicesPage';
import ClassesPage from './pages/ClassesPage';
import DisciplinesPage from './pages/DisciplinesPage';
import LoginChoicePage from './pages/LoginChoicePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import BookClassPage from './pages/BookClassPage';
import PaymentPage from './pages/PaymentPage';
import BookingPendingPage from './pages/BookingPendingPage';
import ProfilePage from './pages/ProfilePage';
import StaffLoginPage from './pages/StaffLoginPage';
import StaffDashboardPage from './pages/StaffDashboardPage';
import StaffSchedulePage from './pages/StaffSchedulePage';
import StaffGalleryPage from './pages/StaffGalleryPage';
import StaffAccountPage from './pages/StaffAccountPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminStaffPage from './pages/AdminStaffPage';
import AdminStudentsPage from './pages/AdminStudentsPage';
import AdminSchedulePage from './pages/AdminSchedulePage';
import AdminPaymentsPage from './pages/AdminPaymentsPage';
import AdminGalleryPage from './pages/AdminGalleryPage';
import AdminSubscriptionsPage from './pages/AdminSubscriptionsPage';
import AdminPromosPage from './pages/AdminPromosPage';
import AdminBulletinPage from './pages/AdminBulletinPage';
import AdminPoliciesPage from './pages/AdminPoliciesPage';
import AdminAbsenceTrackerPage from './pages/AdminAbsenceTrackerPage';
import AdminCoachAvailabilityPage from './pages/AdminCoachAvailabilityPage';
import AdminDisciplinesPage from './pages/AdminDisciplinesPage';
import AdminClassesPage from './pages/AdminClassesPage';
import AdminCoachesPage from './pages/AdminCoachesPage';
import AdminAccountPage from './pages/AdminAccountPage';
import { AdminLayout } from './components/layout/AdminLayout';
import StaffAvailabilityPage from './pages/StaffAvailabilityPage';
import StaffProfilePage from './pages/StaffProfilePage';
import BulletinPage from './pages/BulletinPage';
import CoachesPage from './pages/CoachesPage';
import EventsPage from './pages/EventsPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import StudentPaymentHistoryPage from './pages/StudentPaymentHistoryPage';
import DevelopmentLoginPage from './pages/DevelopmentLoginPage';
import DevDashboardPage from './pages/DevDashboardPage';
import DevTicketsPage from './pages/DevTicketsPage';
import DevAiSetupPage from './pages/DevAiSetupPage';
import DevAccountLogsPage from './pages/DevAccountLogsPage';
import DevProfileLogsPage from './pages/DevProfileLogsPage';
import DevTransactionLogsPage from './pages/DevTransactionLogsPage';
import DevSupportLogsPage from './pages/DevSupportLogsPage';
import DevAccountPage from './pages/DevAccountPage';
import NotFoundPage from './pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    ErrorBoundary: RouteErrorBoundary,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        ErrorBoundary: RouteErrorBoundary,
        errorElement: <RouteErrorBoundary />,
        children: [
          {
            Component: PublicSiteLayout,
            children: [
              { index: true, Component: HomePage },
              { path: 'studio', Component: StudioPage },
              { path: 'studio/guidelines', Component: GuidelinesPage },
              { path: 'gallery', element: <Navigate to="/studio" replace /> },
              { path: 'pricing', Component: PricingPage },
              { path: 'services', Component: ServicesPage },
              { path: 'classes', Component: ClassesPage },
              { path: 'disciplines', Component: DisciplinesPage },
              { path: 'bulletin', Component: BulletinPage },
              { path: 'news', element: <Navigate to="/bulletin" replace /> },
              { path: 'coaches', Component: CoachesPage },
              { path: 'events', Component: EventsPage },
              { path: 'auth', Component: LoginChoicePage },
              { path: 'login', Component: LoginPage },
              { path: 'signup', Component: SignupPage },
              { path: 'profile-setup', Component: ProfileSetupPage },
              { path: 'dashboard', Component: DashboardPage },
              { path: 'book', Component: BookClassPage },
              { path: 'payment', Component: PaymentPage },
              { path: 'booking-pending', Component: BookingPendingPage },
              { path: 'profile', Component: ProfilePage },
              { path: 'payment-history', Component: StudentPaymentHistoryPage },
              { path: '*', Component: NotFoundPage },
            ],
          },
          { path: 'staff-login', Component: StaffLoginPage },
          { path: 'staff-dashboard', Component: StaffDashboardPage },
          { path: 'staff-schedule',   Component: StaffSchedulePage },
          { path: 'staff-gallery',    Component: StaffGalleryPage },
          { path: 'staff-account',      Component: StaffAccountPage },
          { path: 'staff-availability', Component: StaffAvailabilityPage },
          { path: 'staff-profile',      Component: StaffProfilePage },
          { path: 'admin-login', Component: AdminLoginPage },
          {
            Component: AdminLayout,
            ErrorBoundary: RouteErrorBoundary,
            errorElement: <RouteErrorBoundary />,
            children: [
              { path: 'admin-dashboard', Component: AdminDashboardPage },
              { path: 'admin-account', Component: AdminAccountPage },
              { path: 'admin-staff', Component: AdminStaffPage },
              { path: 'admin-coaches', Component: AdminCoachesPage },
              { path: 'admin-students', Component: AdminStudentsPage },
              { path: 'admin-schedule', Component: AdminSchedulePage },
              { path: 'admin-payments', Component: AdminPaymentsPage },
              { path: 'admin-gallery', Component: AdminGalleryPage },
              { path: 'admin-disciplines', Component: AdminDisciplinesPage },
              { path: 'admin-classes', Component: AdminClassesPage },
              { path: 'admin-events', Component: AdminClassesPage },
              { path: 'admin-subscriptions', Component: AdminSubscriptionsPage },
              { path: 'admin-promos', Component: AdminPromosPage },
              { path: 'admin-bulletin', Component: AdminBulletinPage },
              { path: 'admin-news', element: <Navigate to="/admin-bulletin" replace /> },
              { path: 'admin-policies', Component: AdminPoliciesPage },
            ],
          },
          { path: 'admin-absence', Component: AdminAbsenceTrackerPage },
          { path: 'admin-coach-availability', Component: AdminCoachAvailabilityPage },
          { path: 'development', Component: DevelopmentLoginPage },
          { path: 'development/dashboard', Component: DevDashboardPage },
          { path: 'development/account', Component: DevAccountPage },
          { path: 'development/tickets', Component: DevTicketsPage },
          { path: 'development/ai-setup', Component: DevAiSetupPage },
          { path: 'development/logs/accounts', Component: DevAccountLogsPage },
          { path: 'development/logs/profiles', Component: DevProfileLogsPage },
          { path: 'development/logs/transactions', Component: DevTransactionLogsPage },
          { path: 'development/logs/support', Component: DevSupportLogsPage },
        ],
      },
    ],
  },
]);