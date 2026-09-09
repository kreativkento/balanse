import {
  Clock,
  HeartHandshake,
  ShieldCheck,
  Shirt,
  Smartphone,
  Sparkles,
  UserRoundCheck,
  Volume2,
  type LucideIcon,
} from 'lucide-react';

export const GUIDELINES_DOCUMENT_TITLE = 'Studio Guidelines';
export const GUIDELINES_LAST_UPDATED = 'January 15, 2026';
export const GUIDELINES_INTRO =
  'House rules for arriving, booking, and sharing the practice rooms.';
export const GUIDELINES_FILE_NAME = 'Balanse-Studio-Guidelines.pdf';
export const GUIDELINES_IMAGE_FILE_NAME = 'Balanse-Studio-Guidelines.png';

export type GuidelineSection = {
  icon: LucideIcon;
  title: string;
  body: string;
};

export const GUIDELINE_SECTIONS: GuidelineSection[] = [
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
