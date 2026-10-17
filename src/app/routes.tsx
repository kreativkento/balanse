import { createBrowserRouter, Navigate } from 'react-router';
import { Root } from './Root';
import { RouteErrorBoundary } from './components/error/RouteErrorBoundary';
import { PublicSiteLayout } from './components/layout/PublicSiteLayout';
import { MemberSiteLayout } from './components/layout/MemberSiteLayout';
import { StaffSiteLayout } from './components/layout/StaffSiteLayout';
import HomePage from './pages/HomePage';
import StudioPage from './pages/StudioPage';
import GuidelinesPage from './pages/GuidelinesPage';
import PricingPage from './pages/PricingPage';
import ServicesPage from './pages/ServicesPage';
import ClassesPage from './pages/ClassesPage';
import DisciplinesPage from './pages/DisciplinesPage';
import MemberDisciplinesPage from './pages/MemberDisciplinesPage';
import MemberBulletinPage from './pages/MemberBulletinPage';
import StaffBulletinPage from './pages/StaffBulletinPage';
import MemberServicesPage from './pages/MemberServicesPage';
import LoginChoicePage from './pages/LoginChoicePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import MemberDashboardPage from './pages/MemberDashboardPage';
import MemberClasses from './pages/MemberClasses';
import MemberClassSchedule from './pages/MemberClassSchedule';
import MemberGuidelinesPage from './pages/MemberGuidelinesPage';
import MemberSubscription from './pages/MemberSubscription';
import PerformancePage from './pages/PerformancePage';
import FeedbackPage from './pages/FeedbackPage';
import MemberFeedbackPage from './pages/MemberFeedbackPage';
import AdminFeedbackPage from './pages/AdminFeedbackPage';
import MemberPaymentPortal from './pages/MemberPaymentPortal';
import BookingPendingPage from './pages/BookingPendingPage';
import MemberProfilePage from './pages/MemberProfilePage';
import StaffLoginPage from './pages/StaffLoginPage';
import StaffDashboardPage from './pages/StaffDashboardPage';
import StaffRequestsPage from './pages/StaffRequestsPage';
import StaffClassSchedulePage from './pages/StaffClassSchedulePage';
import StaffMyClassesPage from './pages/StaffMyClassesPage';
import StaffTimeSlotsPage from './pages/StaffTimeSlotsPage';
import StaffGalleryPage from './pages/StaffGalleryPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminStaffPage from './pages/AdminStaffPage';
import AdminStudentsPage from './pages/AdminStudentsPage';
import AdminTimeBlockingPage from './pages/AdminTimeBlockingPage';
import AdminClassSchedulePage from './pages/AdminClassSchedulePage';
import AdminCoachRequestsPage from './pages/AdminCoachRequestsPage';
import AdminPaymentsPage from './pages/AdminPaymentsPage';
import AdminPaymentChannelsPage from './pages/AdminPaymentChannelsPage';
import AdminFinancialMetricsPage from './pages/AdminFinancialMetricsPage';
import AdminGalleryPage from './pages/AdminGalleryPage';
import AdminAmenitiesPage from './pages/AdminAmenitiesPage';
import AdminSubscriptionsPage from './pages/AdminSubscriptionsPage';
import AdminPromosPage from './pages/AdminPromosPage';
import AdminBulletinPage from './pages/AdminBulletinPage';
import AdminPoliciesPage from './pages/AdminPoliciesPage';
import AdminAbsenceTrackerPage from './pages/AdminAbsenceTrackerPage';
import AdminCoachAvailabilityPage from './pages/AdminCoachAvailabilityPage';
import AdminDisciplinesPage from './pages/AdminDisciplinesPage';
import AdminEventsRedirect from './pages/AdminEventsRedirect';
import AdminCoachesPage from './pages/AdminCoachesPage';
import AdminAccountPage from './pages/AdminAccountPage';
import { AdminLayout } from './components/layout/AdminLayout';
import { FrontdeskLayout } from './components/layout/FrontdeskLayout';
import { MarketingLayout } from './components/layout/MarketingLayout';
import FrontdeskStudentsPage from './pages/FrontdeskStudentsPage';
import FrontdeskCoachesPage from './pages/FrontdeskCoachesPage';
import FrontdeskDisciplinesPage from './pages/FrontdeskDisciplinesPage';
import FrontdeskClassSchedulePage from './pages/FrontdeskClassSchedulePage';
import FrontdeskBookingsPage from './pages/FrontdeskBookingsPage';
import FrontdeskCancellationsPage from './pages/FrontdeskCancellationsPage';
import FrontdeskPaymentsPage from './pages/FrontdeskPaymentsPage';
import FrontdeskPoliciesPage from './pages/FrontdeskPoliciesPage';
import FrontdeskFeedbackPage from './pages/FrontdeskFeedbackPage';
import FrontdeskAccountPage from './pages/FrontdeskAccountPage';
import FrontdeskDashboardPage from './pages/FrontdeskDashboardPage';
import MarketingDashboardPage from './pages/MarketingDashboardPage';
import MarketingGalleryPage from './pages/MarketingGalleryPage';
import MarketingAmenitiesPage from './pages/MarketingAmenitiesPage';
import MarketingBulletinPage from './pages/MarketingBulletinPage';
import MarketingAccountPage from './pages/MarketingAccountPage';
import MarketingFeedbackPage from './pages/MarketingFeedbackPage';
import StaffAvailabilityPage from './pages/StaffAvailabilityPage';
import StaffProfileRoutePage from './pages/StaffProfileRoutePage';
import BulletinPage from './pages/BulletinPage';
import CoachesPage from './pages/CoachesPage';
import MemberCoachesPage from './pages/MemberCoachesPage';
import EventsPage from './pages/EventsPage';
import MemberPaymentHistoryPage from './pages/MemberPaymentHistoryPage';
import DevelopmentLoginPage from './pages/DevelopmentLoginPage';
import DevDashboardPage from './pages/DevDashboardPage';
import DevTicketsPage from './pages/DevTicketsPage';
import DevAiSetupPage from './pages/DevAiSetupPage';
import DevAccountLogsPage from './pages/DevAccountLogsPage';
import DevProfileLogsPage from './pages/DevProfileLogsPage';
import DevTransactionLogsPage from './pages/DevTransactionLogsPage';
import DevSupportLogsPage from './pages/DevSupportLogsPage';
import DevDisciplineLogsPage from './pages/DevDisciplineLogsPage';
import DevClassLogsPage from './pages/DevClassLogsPage';
import DevBulletinLogsPage from './pages/DevBulletinLogsPage';
import DevAccountPage from './pages/DevAccountPage';
import NotFoundPage from './pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      {
        ErrorBoundary: RouteErrorBoundary,
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
              { path: 'profile-setup', element: <Navigate to="/profile" replace /> },
              { path: 'book', element: <Navigate to="/class-schedule" replace /> },
              { path: 'payment', element: <Navigate to="/member-payment-portal" replace /> },
              { path: 'booking-pending', Component: BookingPendingPage },
              { path: '*', Component: NotFoundPage },
            ],
          },
          {
            Component: MemberSiteLayout,
            children: [
              { path: 'dashboard', Component: MemberDashboardPage },
              { path: 'profile', Component: MemberProfilePage },
              { path: 'documents', element: <Navigate to="/profile" replace /> },
              { path: 'payment-history', Component: MemberPaymentHistoryPage },
              { path: 'performance', Component: PerformancePage },
              { path: 'subscriptions', Component: MemberSubscription },
              { path: 'my-classes', Component: MemberClasses },
              { path: 'class-schedule', Component: MemberClassSchedule },
              { path: 'member-payment-portal', Component: MemberPaymentPortal },
              { path: 'studio-guidelines', Component: MemberGuidelinesPage },
              { path: 'studio-services', Component: MemberServicesPage },
              { path: 'studio-coaches', Component: MemberCoachesPage },
              { path: 'studio-disciplines', Component: MemberDisciplinesPage },
              { path: 'member-bulletin', Component: MemberBulletinPage },
              { path: 'feedback', Component: MemberFeedbackPage },
            ],
          },
          { path: 'staff-login', Component: StaffLoginPage },
          {
            Component: StaffSiteLayout,
            children: [
              { path: 'staff-dashboard', Component: StaffDashboardPage },
              { path: 'staff-requests', Component: StaffRequestsPage },
              { path: 'staff-schedule', element: <Navigate to="/staff-requests" replace /> },
              { path: 'staff-my-classes', Component: StaffMyClassesPage },
              { path: 'staff-my-schedule', element: <Navigate to="/staff-my-classes" replace /> },
              { path: 'staff-time-slots', Component: StaffTimeSlotsPage },
              { path: 'staff-class-schedule', Component: StaffClassSchedulePage },
              { path: 'staff-gallery', Component: StaffGalleryPage },
              { path: 'staff-availability', Component: StaffAvailabilityPage },
              { path: 'staff-profile', Component: StaffProfileRoutePage },
              { path: 'staff-bulletin', Component: StaffBulletinPage },
              { path: 'staff-feedback', Component: FeedbackPage },
            ],
          },
          { path: 'admin-login', Component: AdminLoginPage },
          {
            Component: AdminLayout,
            ErrorBoundary: RouteErrorBoundary,
            children: [
              { path: 'admin-dashboard', Component: AdminDashboardPage },
              { path: 'admin-account', Component: AdminAccountPage },
              { path: 'admin-financial-metrics', Component: AdminFinancialMetricsPage },
              { path: 'admin-staff', Component: AdminStaffPage },
              { path: 'admin-coaches', Component: AdminCoachesPage },
              { path: 'admin-students', Component: AdminStudentsPage },
              { path: 'admin-schedule', Component: AdminTimeBlockingPage },
              { path: 'admin-payments', Component: AdminPaymentsPage },
              { path: 'admin-payment-channels', Component: AdminPaymentChannelsPage },
              { path: 'admin-gallery', Component: AdminGalleryPage },
              { path: 'admin-amenities', Component: AdminAmenitiesPage },
              { path: 'admin-disciplines', Component: AdminDisciplinesPage },
              { path: 'admin-classes', Component: AdminClassSchedulePage },
              { path: 'admin-coach-requests', Component: AdminCoachRequestsPage },
              { path: 'admin-events', Component: AdminEventsRedirect },
              { path: 'admin-subscriptions', Component: AdminSubscriptionsPage },
              { path: 'admin-promos', Component: AdminPromosPage },
              { path: 'admin-bulletin', Component: AdminBulletinPage },
              { path: 'admin-news', element: <Navigate to="/admin-bulletin" replace /> },
              { path: 'admin-policies', Component: AdminPoliciesPage },
              { path: 'admin-feedback', Component: AdminFeedbackPage },
            ],
          },
          {
            Component: FrontdeskLayout,
            ErrorBoundary: RouteErrorBoundary,
            children: [
              { path: 'frontdesk-dashboard', Component: FrontdeskDashboardPage },
              { path: 'frontdesk-account', Component: FrontdeskAccountPage },
              { path: 'frontdesk-students', Component: FrontdeskStudentsPage },
              { path: 'frontdesk-coaches', Component: FrontdeskCoachesPage },
              { path: 'frontdesk-disciplines', Component: FrontdeskDisciplinesPage },
              { path: 'frontdesk-classes', Component: FrontdeskClassSchedulePage },
              { path: 'frontdesk-bookings', Component: FrontdeskBookingsPage },
              { path: 'frontdesk-cancellations', Component: FrontdeskCancellationsPage },
              { path: 'frontdesk-payments', Component: FrontdeskPaymentsPage },
              { path: 'frontdesk-policies', Component: FrontdeskPoliciesPage },
              { path: 'frontdesk-feedback', Component: FrontdeskFeedbackPage },
            ],
          },
          {
            Component: MarketingLayout,
            ErrorBoundary: RouteErrorBoundary,
            children: [
              { path: 'marketing-dashboard', Component: MarketingDashboardPage },
              { path: 'marketing-account', Component: MarketingAccountPage },
              { path: 'marketing-gallery', Component: MarketingGalleryPage },
              { path: 'marketing-amenities', Component: MarketingAmenitiesPage },
              { path: 'marketing-bulletin', Component: MarketingBulletinPage },
              { path: 'marketing-feedback', Component: MarketingFeedbackPage },
            ],
          },
          { path: 'admin-absence', Component: AdminAbsenceTrackerPage },
          { path: 'admin-coach-availability', Component: AdminCoachAvailabilityPage },
          { path: 'development', Component: DevelopmentLoginPage },
          { path: 'development/dashboard', Component: DevDashboardPage },
          { path: 'development/account', Component: DevAccountPage },
          { path: 'development/tickets', Component: DevTicketsPage },
          { path: 'development/feedback', Component: FeedbackPage },
          { path: 'development/ai-setup', Component: DevAiSetupPage },
          { path: 'development/logs/accounts', Component: DevAccountLogsPage },
          { path: 'development/logs/profiles', Component: DevProfileLogsPage },
          { path: 'development/logs/disciplines', Component: DevDisciplineLogsPage },
          { path: 'development/logs/classes', Component: DevClassLogsPage },
          { path: 'development/logs/bulletin', Component: DevBulletinLogsPage },
          { path: 'development/logs/transactions', Component: DevTransactionLogsPage },
          { path: 'development/logs/support', Component: DevSupportLogsPage },
        ],
      },
    ],
  },
]);