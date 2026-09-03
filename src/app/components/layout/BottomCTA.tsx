import { Link, useNavigate } from 'react-router';
import { Calendar, Facebook, Instagram, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface BottomCTAProps {
  label?: string;
}

const LOGO_SRC = '/logo_main_white.svg';

const exploreLinks = [{ label: 'About Us', path: '/' }];

const studioLinks = [
  { label: 'Amenities', path: '/studio' },
  { label: 'Guidelines', path: '/studio/guidelines' },
];

const ratesLinks = [
  { label: 'Pricing and Plans', path: '/pricing' },
  { label: 'Services', path: '/services' },
];

const classesLinks = [
  { label: 'Class Schedules', path: '/classes' },
  { label: 'Disciplines', path: '/disciplines' },
];

const communityLinks = [
  { label: 'Bulletin', path: '/bulletin' },
  { label: 'Events', path: '/events' },
];

const linkColumns = [
  { title: 'Explore', links: exploreLinks },
  { title: 'Our Studio', links: studioLinks },
  { title: 'Our Rates', links: ratesLinks },
  { title: 'Our Classes', links: classesLinks },
  { title: 'Our Community', links: communityLinks },
];

const socialLinks = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/',
    icon: Facebook,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/',
    icon: Instagram,
  },
  {
    label: 'Email',
    href: 'mailto:support@balanse.com',
    icon: Mail,
  },
];

function FooterLinkColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; path: string }[];
}) {
  return (
    <div>
      <h3
        className="text-white/90 text-[11px] uppercase tracking-[0.14em] mb-3"
        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.95rem', letterSpacing: '0.12em' }}
      >
        {title}
      </h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.path}>
            <Link
              to={link.path}
              className="text-[#B0A898] text-sm hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BottomCTA({ label = 'Book / Schedule' }: BottomCTAProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleClick = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <>
      {/* Site footer */}
      <footer className="bg-[#1E2A35] border-t border-[#D4CDB5]/20">
        {/* Brand + quick links */}
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-12">
          <div className="flex flex-col lg:flex-row lg:items-start gap-12 lg:gap-20 xl:gap-28">
            {/* Brand column */}
            <div className="flex flex-col min-h-[140px] shrink-0 lg:w-[200px]">
              <Link to="/" className="inline-block w-fit shrink-0">
                <img
                  src={LOGO_SRC}
                  alt="BALANSÉ Wellness Hub"
                  className="h-9 md:h-10 w-auto object-contain"
                />
              </Link>

              <div className="flex items-center gap-3 mt-5">
                {socialLinks.map(({ label: socialLabel, href, icon: Icon }) => (
                  <a
                    key={socialLabel}
                    href={href}
                    target={href.startsWith('mailto:') ? undefined : '_blank'}
                    rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                    aria-label={socialLabel}
                    className="inline-flex items-center justify-center size-9 rounded-full border border-white/15 text-[#B0A898] hover:text-white hover:border-white/40 hover:bg-white/5 transition-colors"
                  >
                    <Icon size={16} strokeWidth={1.75} />
                  </a>
                ))}
              </div>

              <p className="mt-auto pt-8 text-white/30 text-[11px] tracking-wide">
                © 2026 BALANSÉ · All rights reserved
              </p>
            </div>

            {/* Quick link columns (mirror Navbar) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-10 lg:gap-8 flex-1 min-w-0">
              {linkColumns.map((column) => (
                <FooterLinkColumn key={column.title} title={column.title} links={column.links} />
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile: sticky bottom bar */}
      <div className="md:hidden sticky bottom-0 z-20 bg-gradient-to-t from-[#F8F3E8] via-[#F8F3E8]/95 to-transparent pt-2 pb-3 px-5 border-t border-[#D4CDB5]/60">
        <button
          onClick={handleClick}
          className="w-full flex items-center justify-center gap-2 bg-[#c49a3c] text-white font-bold text-sm rounded-full py-3 min-h-[44px] shadow-[0_4px_24px_rgba(196,154,60,0.4)] active:scale-[0.97] transition-all hover:bg-[#a67f2e]"
        >
          <Calendar size={16} />
          {label}
        </button>
      </div>
    </>
  );
}
