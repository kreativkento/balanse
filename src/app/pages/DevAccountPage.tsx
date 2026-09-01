import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useDevAuth } from '../context/DevAuthContext';
import { DevSidebar } from '../components/layout/DevSidebar';
import { AccountImagesCard } from '../components/ProfileImages';

export default function DevAccountPage() {
  const navigate = useNavigate();
  const { devUser, updateDevImages } = useDevAuth();

  useEffect(() => {
    if (!devUser) navigate('/development');
  }, [devUser, navigate]);

  if (!devUser) return null;

  const initials = devUser.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <DevSidebar>
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
            name={devUser.name}
            email={devUser.email}
            roleLabel="Developer"
            photoUrl={devUser.photo}
            coverUrl={devUser.coverImage}
            initials={initials || 'DV'}
            onPhotoUploaded={(url) => updateDevImages({ photo: url })}
            onCoverUploaded={(url) => updateDevImages({ coverImage: url })}
          />
        </div>
      </div>
    </DevSidebar>
  );
}
