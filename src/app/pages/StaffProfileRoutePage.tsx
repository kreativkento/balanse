import { Navigate } from 'react-router';
import { useStaffAuth } from '../context/StaffAuthContext';
import StaffCoachProfilePage from './StaffCoachProfilePage';
import StaffProfilePage from './StaffProfilePage';

/** Picks coach vs ops profile UI from `profiles_staff.staff_type`. */
export default function StaffProfileRoutePage() {
  const { staffUser, staffAuthReady } = useStaffAuth();

  if (!staffAuthReady) return null;
  if (!staffUser) return <Navigate to="/staff-login" replace />;

  if (staffUser.staffType === 'Administrator') {
    return <StaffProfilePage />;
  }

  return <StaffCoachProfilePage />;
}
