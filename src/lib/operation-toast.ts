import { toast } from 'sonner';

/** Consistent success toasts for create / update / delete across portals. */
export function toastCreated(subject?: string) {
  toast.success(subject ? `${subject} created.` : 'Created successfully.');
}

export function toastUpdated(subject?: string) {
  toast.success(subject ? `${subject} updated.` : 'Changes saved.');
}

export function toastSaved(subject?: string) {
  toast.success(subject ? `${subject} saved.` : 'Changes saved.');
}

export function toastDeleted(subject?: string) {
  toast.success(subject ? `${subject} deleted.` : 'Deleted successfully.');
}

export function toastOperationFailed(message: string) {
  toast.error(message);
}
