import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Newspaper } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function AdminBulletinPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  if (!adminUser) return null;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Admin › Marketing</span>
        <h1
          className="text-[#1E2A35] mt-1"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.04em' }}
        >
          Bulletin
        </h1>
        <p className="text-[#8A7E6E] text-sm mt-1">
          Publish studio announcements and updates for clients.
        </p>
      </div>
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm px-8 py-16 flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-[#F8F3E8] border border-[#D4CDB5]/60 flex items-center justify-center">
          <Newspaper size={22} className="text-[#c49a3c]" />
        </div>
        <p className="text-[#1E2A35] font-semibold">No posts yet</p>
        <p className="text-[#8A7E6E] text-sm max-w-sm">
          Bulletin management will live here. Content tools can be wired up next.
        </p>
      </div>
    </div>
  );
}
