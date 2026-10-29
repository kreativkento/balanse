import type { CategorizedFilterGroup } from './CategorizedAddFilter';

export const PORTAL_REQUEST_STATUS_FILTER_GROUP: CategorizedFilterGroup = {
  id: 'status',
  label: 'Status',
  options: [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'cancelled', label: 'Cancelled' },
  ],
};

export const ACCOUNT_STATUS_FILTER_GROUP: CategorizedFilterGroup = {
  id: 'status',
  label: 'Status',
  options: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ],
};

export const PROFILE_COMPLETE_FILTER_GROUP: CategorizedFilterGroup = {
  id: 'profile',
  label: 'Profile',
  options: [
    { value: 'complete', label: 'Complete' },
    { value: 'incomplete', label: 'Incomplete' },
  ],
};

export const AVAILABILITY_DAY_FILTER_GROUP: CategorizedFilterGroup = {
  id: 'status',
  label: 'Status',
  options: [
    { value: 'open', label: 'Open' },
    { value: 'day_off', label: 'Day Off' },
  ],
};
