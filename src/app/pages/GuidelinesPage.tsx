import {
  Clock,
  HeartHandshake,
  ShieldCheck,
  Shirt,
  Smartphone,
  Sparkles,
  UserRoundCheck,
  Volume2,
} from 'lucide-react';
import { PublicBreadcrumb } from '../components/layout/PublicBreadcrumb';

const GUIDELINE_SECTIONS = [
  {
    icon: Clock,
    title: 'Arriving on time',
    body: 'Please arrive at least 10 minutes before class so you can settle in, change, and check in at reception. Late entry after the first 10 minutes may be declined so the session can stay focused.',
  },
  {
    icon: Shirt,
    title: 'What to wear & bring',
    body: 'Wear movement-ready clothing you can stretch and sweat in. Socks are required for Reformer Pilates. Yoga mats and most props are provided — you are welcome to bring your own towel and water bottle.',
  },
  {
    icon: Sparkles,
    title: 'Studio care',
    body: 'Wipe down equipment after use and return props to their marked spots. Food and colored drinks stay outside the movement rooms. Only water is allowed on the studio floor.',
  },
  {
    icon: Volume2,
    title: 'Shared space',
    body: 'Keep conversations soft in the practice rooms. Phones on silent, please — and step into the lounge if you need to take a call. This is a space for presence as much as it is for movement.',
  },
  {
    icon: UserRoundCheck,
    title: 'Booking & cancellation',
    body: 'Reserve your spot through the BALANSÉ app or website. Cancel at least 12 hours before class so someone on the waitlist can take your place. Repeated no-shows may affect future bookings.',
  },
  {
    icon: ShieldCheck,
    title: 'Safety first',
    body: 'Tell your coach about injuries or conditions before class starts. Move at your own pace — modifications are always offered. If you feel dizzy or unwell, stop and let a coach know immediately.',
  },
  {
    icon: Smartphone,
    title: 'Photos & devices',
    body: 'Please ask before photographing others. Coaching sessions and classes should not be recorded unless the coach has given permission. Lockers are available for phones and valuables.',
  },
  {
    icon: HeartHandshake,
    title: 'Community',
    body: 'BALANSÉ is built on respect. We welcome every body and every starting point. Harassment, discrimination, or unsafe behavior will not be tolerated and may result in being asked to leave.',
  },
];

export default function GuidelinesPage() {
  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      <div className="border-b border-[#D4CDB5]/60">
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-5 pb-5">
          <PublicBreadcrumb parent="Our Studio" current="Guidelines" parentTo="/studio" />
          <h1
            className="text-[#1E2A35] leading-none"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              letterSpacing: '0.05em',
            }}
          >
            Studio Guidelines
          </h1>
          <p className="text-[#8A7E6E] text-sm mt-2 max-w-xl">
            Temporary house rules for visiting BALANSÉ. Final copy will replace this once the studio confirms its policies.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {GUIDELINE_SECTIONS.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-3xl border border-[#D4CDB5]/60 bg-white p-5 shadow-sm md:p-6"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4CDB5]/60 bg-[#F8F3E8] text-[#c49a3c]">
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <h2
                  className="text-[#1E2A35] leading-none"
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '1.25rem',
                    letterSpacing: '0.05em',
                  }}
                >
                  {title}
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-[#5A5048]">{body}</p>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-xs italic text-[#B0A898]">
          Placeholder content — update these guidelines before launch.
        </p>
      </div>
    </div>
  );
}
