import { createBrowserRouter, Navigate } from 'react-router';
import { lazy } from 'react';
import { Root } from './Root';
import { RouteErrorBoundary } from './components/error/RouteErrorBoundary';
import { PublicSiteLayout } from './components/layout/PublicSiteLayout';
import { MemberSiteLayout } from './components/layout/MemberSiteLayout';
import { StaffSiteLayout } from './components/layout/StaffSiteLayout';
import HomePage from './pages/HomePage';
const StudioPage = lazy(() => import('./pages/StudioPage'));
const GuidelinesPage = lazy(() => import('./pages/GuidelinesPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const ClassesPage = lazy(() => import('./pages/ClassesPage'));
const DisciplinesPage = lazy(() => import('./pages/DisciplinesPage'));
const MemberDisciplinesPage = lazy(() => import('./pages/MemberDisciplinesPage'));
const MemberBulletinPage = lazy(() => import('./pages/MemberBulletinPage'));
const StaffBulletinPage = lazy(() => import('./pages/StaffBulletinPage'));
const MemberServicesPage = lazy(() => import('./pages/MemberServicesPage'));
import LoginChoicePage from './pages/LoginChoicePage';
const LoginPage = lazy(() => import('./pages/LoginPage'));
const MemberForgotPasswordPage = lazy(() => import('./pages/MemberForgotPasswordPage'));
const InternalForgotPasswordPage = lazy(() => import('./pages/InternalForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const MemberDashboardPage = lazy(() => import('./pages/MemberDashboardPage'));
const MemberClasses = lazy(() => import('./pages/MemberClasses'));
const MemberClassSchedule = lazy(() => import('./pages/MemberClassSchedule'));
const MemberGuidelinesPage = lazy(() => import('./pages/MemberGuidelinesPage'));
const MemberCreditsPage = lazy(() => import('./pages/MemberCreditsPage'));
const MemberCreditsCheckoutPage = lazy(() => import('./pages/MemberCreditsCheckoutPage'));
const PerformancePage = lazy(() => import('./pages/PerformancePage'));
const CoachFeedbackPage = lazy(() => import('./pages/CoachFeedbackPage'));
const DevFeedbackPage = lazy(() => import('./pages/DevFeedbackPage'));
const MemberFeedbackPage = lazy(() => import('./pages/MemberFeedbackPage'));
const AdminFeedbackPage = lazy(() => import('./pages/AdminFeedbackPage'));
const MemberPaymentPortal = lazy(() => import('./pages/MemberPaymentPortal'));
const BookingPendingPage = lazy(() => import('./pages/BookingPendingPage'));
const MemberProfilePage = lazy(() => import('./pages/MemberProfilePage'));
const StaffLoginPage = lazy(() => import('./pages/StaffLoginPage'));
const StaffDashboardPage = lazy(() => import('./pages/StaffDashboardPage'));
const StaffRequestsPage = lazy(() => import('./pages/StaffRequestsPage'));
const StaffClassSchedulePage = lazy(() => import('./pages/StaffClassSchedulePage'));
const StaffMyClassesPage = lazy(() => import('./pages/StaffMyClassesPage'));
const StaffTimeSlotsPage = lazy(() => import('./pages/StaffTimeSlotsPage'));
const StaffGalleryPage = lazy(() => import('./pages/StaffGalleryPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminStaffPage = lazy(() => import('./pages/AdminStaffPage'));
const AdminStudentsPage = lazy(() => import('./pages/AdminStudentsPage'));
const AdminTimeBlockingPage = lazy(() => import('./pages/AdminTimeBlockingPage'));
const AdminClassSchedulePage = lazy(() => import('./pages/AdminClassSchedulePage'));
const AdminCoachRequestsPage = lazy(() => import('./pages/AdminCoachRequestsPage'));
const AdminPaymentsPage = lazy(() => import('./pages/AdminPaymentsPage'));
const AdminOfficialReceiptsPage = lazy(() => import('./pages/AdminOfficialReceiptsPage'));
const AdminPaymentChannelsPage = lazy(() => import('./pages/AdminPaymentChannelsPage'));
const AdminCreditsPage = lazy(() => import('./pages/AdminCreditsPage'));
const AdminGalleryPage = lazy(() => import('./pages/AdminGalleryPage'));
const AdminAmenitiesPage = lazy(() => import('./pages/AdminAmenitiesPage'));
const AdminSubscriptionsPage = lazy(() => import('./pages/AdminSubscriptionsPage'));
const AdminPromosPage = lazy(() => import('./pages/AdminPromosPage'));
const AdminBulletinPage = lazy(() => import('./pages/AdminBulletinPage'));
const AdminPoliciesPage = lazy(() => import('./pages/AdminPoliciesPage'));
const AdminAbsenceTrackerPage = lazy(() => import('./pages/AdminAbsenceTrackerPage'));
const AdminCoachAvailabilityPage = lazy(() => import('./pages/AdminCoachAvailabilityPage'));
const AdminDisciplinesPage = lazy(() => import('./pages/AdminDisciplinesPage'));
const AdminEventsRedirect = lazy(() => import('./pages/AdminEventsRedirect'));
const AdminCoachesPage = lazy(() => import('./pages/AdminCoachesPage'));
const AdminAccountPage = lazy(() => import('./pages/AdminAccountPage'));
import { AdminLayout } from './components/layout/AdminLayout';
import { FrontdeskLayout } from './components/layout/FrontdeskLayout';
import { MarketingLayout } from './components/layout/MarketingLayout';
const FrontdeskStudentsPage = lazy(() => import('./pages/FrontdeskStudentsPage'));
const FrontdeskCoachesPage = lazy(() => import('./pages/FrontdeskCoachesPage'));
const FrontdeskDisciplinesPage = lazy(() => import('./pages/FrontdeskDisciplinesPage'));
const FrontdeskClassSchedulePage = lazy(() => import('./pages/FrontdeskClassSchedulePage'));
const FrontdeskBookingsPage = lazy(() => import('./pages/FrontdeskBookingsPage'));
const FrontdeskCancellationsPage = lazy(() => import('./pages/FrontdeskCancellationsPage'));
const FrontdeskPaymentsPage = lazy(() => import('./pages/FrontdeskPaymentsPage'));
const FrontdeskPoliciesPage = lazy(() => import('./pages/FrontdeskPoliciesPage'));
const FrontdeskFeedbackPage = lazy(() => import('./pages/FrontdeskFeedbackPage'));
const FrontdeskAccountPage = lazy(() => import('./pages/FrontdeskAccountPage'));
const FrontdeskDashboardPage = lazy(() => import('./pages/FrontdeskDashboardPage'));
const FrontdeskGalleryPage = lazy(() => import('./pages/FrontdeskGalleryPage'));
const FrontdeskAmenitiesPage = lazy(() => import('./pages/FrontdeskAmenitiesPage'));
const FrontdeskBulletinPage = lazy(() => import('./pages/FrontdeskBulletinPage'));
const MarketingDashboardPage = lazy(() => import('./pages/MarketingDashboardPage'));
const MarketingGalleryPage = lazy(() => import('./pages/MarketingGalleryPage'));
const MarketingAmenitiesPage = lazy(() => import('./pages/MarketingAmenitiesPage'));
const MarketingAccountPage = lazy(() => import('./pages/MarketingAccountPage'));
const MarketingFeedbackPage = lazy(() => import('./pages/MarketingFeedbackPage'));
const StaffAvailabilityPage = lazy(() => import('./pages/StaffAvailabilityPage'));
const StaffProfileRoutePage = lazy(() => import('./pages/StaffProfileRoutePage'));
const BulletinPage = lazy(() => import('./pages/BulletinPage'));
const CoachesPage = lazy(() => import('./pages/CoachesPage'));
const MemberCoachesPage = lazy(() => import('./pages/MemberCoachesPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const MemberPaymentHistoryPage = lazy(() => import('./pages/MemberPaymentHistoryPage'));
const DevelopmentLoginPage = lazy(() => import('./pages/DevelopmentLoginPage'));
const DevDashboardPage = lazy(() => import('./pages/DevDashboardPage'));
const DevTicketsPage = lazy(() => import('./pages/DevTicketsPage'));
const DevAiSetupPage = lazy(() => import('./pages/DevAiSetupPage'));
const DevAccountLogsPage = lazy(() => import('./pages/DevAccountLogsPage'));
const DevProfileLogsPage = lazy(() => import('./pages/DevProfileLogsPage'));
const DevTransactionLogsPage = lazy(() => import('./pages/DevTransactionLogsPage'));
const DevSupportLogsPage = lazy(() => import('./pages/DevSupportLogsPage'));
const DevDisciplineLogsPage = lazy(() => import('./pages/DevDisciplineLogsPage'));
const DevClassLogsPage = lazy(() => import('./pages/DevClassLogsPage'));
const DevBulletinLogsPage = lazy(() => import('./pages/DevBulletinLogsPage'));
const DevAccountPage = lazy(() => import('./pages/DevAccountPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

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
              { path: 'member-forgot-password', Component: MemberForgotPasswordPage },
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
              { path: 'subscriptions', element: <Navigate to="/credits" replace /> },
              { path: 'credits', Component: MemberCreditsPage },
              { path: 'credits/checkout', Component: MemberCreditsCheckoutPage },
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
          { path: 'internal-forgot-password', Component: InternalForgotPasswordPage },
          { path: 'reset-password', Component: ResetPasswordPage },
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
              { path: 'staff-feedback', Component: CoachFeedbackPage },
            ],
          },
          { path: 'admin-login', Component: AdminLoginPage },
          {
            Component: AdminLayout,
            ErrorBoundary: RouteErrorBoundary,
            children: [
              { path: 'admin-dashboard', Component: AdminDashboardPage },
              { path: 'admin-account', Component: AdminAccountPage },
              { path: 'admin-credits', Component: AdminCreditsPage },
              { path: 'admin-financial-metrics', element: <Navigate to="/admin-credits" replace /> },
              { path: 'admin-staff', Component: AdminStaffPage },
              { path: 'admin-coaches', Component: AdminCoachesPage },
              { path: 'admin-students', Component: AdminStudentsPage },
              { path: 'admin-schedule', Component: AdminTimeBlockingPage },
              { path: 'admin-payments', Component: AdminPaymentsPage },
              { path: 'admin-official-receipts', Component: AdminOfficialReceiptsPage },
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
              { path: 'frontdesk-gallery', Component: FrontdeskGalleryPage },
              { path: 'frontdesk-amenities', Component: FrontdeskAmenitiesPage },
              { path: 'frontdesk-bulletin', Component: FrontdeskBulletinPage },
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
              { path: 'marketing-bulletin', element: <Navigate to="/marketing-dashboard" replace /> },
              { path: 'marketing-feedback', Component: MarketingFeedbackPage },
            ],
          },
          { path: 'admin-absence', Component: AdminAbsenceTrackerPage },
          { path: 'admin-coach-availability', Component: AdminCoachAvailabilityPage },
          { path: 'development', Component: DevelopmentLoginPage },
          { path: 'development/dashboard', Component: DevDashboardPage },
          { path: 'development/account', Component: DevAccountPage },
          { path: 'development/tickets', Component: DevTicketsPage },
          { path: 'development/feedback', Component: DevFeedbackPage },
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
