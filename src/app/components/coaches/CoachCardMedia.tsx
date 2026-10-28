import { useState, type ReactNode } from 'react';

interface CoachCardMediaProps {
  photo: string;
  name: string;
  initials: string;
  color: string;
  children?: ReactNode;
}

/** Shared 3:2 image treatment for coach directory cards. */
export function CoachCardMedia({ photo, name, initials, color, children }: CoachCardMediaProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative aspect-[3/2] w-full shrink-0 overflow-hidden" style={{ backgroundColor: `${color}15` }}>
      {!imgError && photo ? (
        <img
          src={photo}
          alt={`Coach ${name}`}
          loading="lazy"
          decoding="async"
          className="block h-full w-full object-cover object-[center_25%]"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.1em', color, opacity: 0.4 }}>
            {initials}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
