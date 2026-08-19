import { createBrowserRouter } from 'react-router';
import { Root } from './Root';
import HomePage from './pages/HomePage';
import GalleryPage from './pages/GalleryPage';
import PricingPage from './pages/PricingPage';
import ClassesPage from './pages/ClassesPage';
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
import AdminNewsPage from './pages/AdminNewsPage';
import AdminPoliciesPage from './pages/AdminPoliciesPage';
import AdminAbsenceTrackerPage from './pages/AdminAbsenceTrackerPage';
import AdminCoachAvailabilityPage from './pages/AdminCoachAvailabilityPage';
import AdminDisciplinesPage from './pages/AdminDisciplinesPage';
import AdminClassesPage from './pages/AdminClassesPage';
import AdminCoachesPage from './pages/AdminCoachesPage';
import StaffAvailabilityPage from './pages/StaffAvailabilityPage';
import StaffProfilePage from './pages/StaffProfilePage';
import NewsPage from './pages/NewsPage';
import CoachesPage from './pages/CoachesPage';
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

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: HomePage },
      { path: 'gallery', Component: GalleryPage },
      { path: 'pricing', Component: PricingPage },
      { path: 'classes', Component: ClassesPage },
      { path: 'news', Component: NewsPage },
      { path: 'coaches', Component: CoachesPage },
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
      { path: 'staff-login', Component: StaffLoginPage },
      { path: 'staff-dashboard', Component: StaffDashboardPage },
      { path: 'staff-schedule',   Component: StaffSchedulePage },
      { path: 'staff-gallery',    Component: StaffGalleryPage },
      { path: 'staff-account',      Component: StaffAccountPage },
      { path: 'staff-availability', Component: StaffAvailabilityPage },
      { path: 'staff-profile',      Component: StaffProfilePage },
      { path: 'admin-login', Component: AdminLoginPage },
      { path: 'admin-dashboard', Component: AdminDashboardPage },
      { path: 'admin-staff', Component: AdminStaffPage },
      { path: 'admin-coaches', Component: AdminCoachesPage },
      { path: 'admin-students', Component: AdminStudentsPage },
      { path: 'admin-schedule',   Component: AdminSchedulePage },
      { path: 'admin-payments',   Component: AdminPaymentsPage },
      { path: 'admin-gallery',    Component: AdminGalleryPage },
      { path: 'admin-disciplines', Component: AdminDisciplinesPage },
      { path: 'admin-classes', Component: AdminClassesPage },
      { path: 'admin-events', Component: AdminClassesPage },
      { path: 'admin-subscriptions', Component: AdminSubscriptionsPage },
      { path: 'admin-promos',     Component: AdminPromosPage },
      { path: 'admin-news',       Component: AdminNewsPage },
      { path: 'admin-policies',   Component: AdminPoliciesPage },
      { path: 'admin-absence',             Component: AdminAbsenceTrackerPage },
      { path: 'admin-coach-availability',  Component: AdminCoachAvailabilityPage },
      { path: 'development', Component: DevelopmentLoginPage },
      { path: 'development/dashboard', Component: DevDashboardPage },
      { path: 'development/tickets', Component: DevTicketsPage },
      { path: 'development/ai-setup', Component: DevAiSetupPage },
      { path: 'development/logs/accounts', Component: DevAccountLogsPage },
      { path: 'development/logs/profiles', Component: DevProfileLogsPage },
      { path: 'development/logs/transactions', Component: DevTransactionLogsPage },
      { path: 'development/logs/support', Component: DevSupportLogsPage },
    ],
  },
]);