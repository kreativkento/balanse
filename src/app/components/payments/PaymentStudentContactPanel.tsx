import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { AdminClientContactCardModal } from './AdminClientContactCardModal';
import { ProfileAvatar } from '../ProfileImages';

export type PaymentStudentContactInfo = {
  accountId: string;
  student: string;
  email: string;
  studentPhotoUrl: string;
};

function studentInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

export function PaymentStudentContactPanel({ payment }: { payment: PaymentStudentContactInfo }) {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setContactOpen(true)}
        className="group w-full rounded-2xl p-4 border border-[#D4CDB5]/40 bg-[#F8F3E8] text-left transition-colors hover:border-[#c49a3c]/40 hover:bg-[#FBF9F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/30"
      >
        <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2 flex items-center justify-between gap-2">
          Student
          <ChevronRight
            size={14}
            className="text-[#c49a3c] opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 shrink-0"
            aria-hidden
          />
        </p>
        <div className="flex items-center gap-2.5">
          <ProfileAvatar
            src={payment.studentPhotoUrl || undefined}
            initials={studentInitials(payment.student)}
            alt={payment.student}
            className="w-9 h-9 rounded-xl shrink-0 bg-[#c49a3c]/12 border border-[#c49a3c]/25"
            initialsClassName="text-[#a67f2e] text-xs font-bold"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[#1E2A35] text-sm font-semibold truncate">{payment.student}</p>
            <p className="text-[#9A8E7E] text-xs truncate">{payment.email}</p>
          </div>
        </div>
      </button>

      {contactOpen && payment.accountId ? (
        <AdminClientContactCardModal
          accountId={payment.accountId}
          fallbackName={payment.student}
          fallbackEmail={payment.email}
          fallbackPhoto={payment.studentPhotoUrl}
          onClose={() => setContactOpen(false)}
        />
      ) : null}
    </>
  );
}
