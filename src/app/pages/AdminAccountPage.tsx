import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AccountImagesCard } from '../components/ProfileImages';
import type { UserRole } from '../../lib/database.types';

function roleLabel(role: UserRole): string {
  if (role === 'frontdesk') return 'Front Desk';
  if (role === 'marketing') return 'Marketing';
  if (role === 'dev') return 'Developer';
  if (role === 'coach') return 'Coach';
  return 'Admin';
}

export default function AdminAccountPage() {
  const navigate = useNavigate();
  const { adminUser, updateAdminImages } = useAdminAuth();

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  if (!adminUser) return null;

  const initials = adminUser.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        <h1
          className="text-[#1E2A35] leading-none mb-1"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', letterSpacing: '0.05em' }}
        >
          My Profile
        </h1>
        <p className="text-[#8A7E6E] text-sm mb-6">Upload a profile photo and cover image. These are used across BALANSÉ.</p>
        <AccountImagesCard
          name={adminUser.name}
          email={adminUser.email}
          roleLabel={roleLabel(adminUser.role)}
          photoUrl={adminUser.photo}
          coverUrl={adminUser.coverImage}
          initials={initials || 'AD'}
          onPhotoUploaded={(url) => updateAdminImages({ photo: url })}
          onCoverUploaded={(url) => updateAdminImages({ coverImage: url })}
        />
      </div>
    </div>
  );
}
