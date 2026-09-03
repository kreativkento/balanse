import { CalendarDays } from 'lucide-react';
import { PublicBreadcrumb } from '../components/layout/PublicBreadcrumb';

export default function EventsPage() {
  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-8">
          <PublicBreadcrumb parent="Our Community" current="Events" parentTo="/bulletin" />
          <h1
            className="text-[#1E2A35] leading-tight"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.5rem, 6vw, 4rem)', letterSpacing: '0.04em' }}
          >
            Events
          </h1>
          <p className="text-[#8A7E6E] text-sm mt-1 max-w-xl">
            Workshops, open mats, and community gatherings at BALANSÉ.
          </p>
        </div>

        <div className="rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm px-6 py-16 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#F8F3E8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#c49a3c] mb-4">
            <CalendarDays size={22} />
          </div>
          <p className="text-[#1E2A35] text-sm font-semibold">No upcoming events yet</p>
          <p className="text-[#8A7E6E] text-sm mt-1 max-w-sm">
            Check back soon for workshops, open mats, and special community sessions.
          </p>
        </div>
      </div>
    </div>
  );
}
