import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { BarChart3 } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function AdminFinancialMetricsPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
      <div className="rounded-2xl border border-[#D4CDB5]/60 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F8F3E8] text-[#c49a3c]">
          <BarChart3 size={24} strokeWidth={2} />
        </div>
        <p className="text-[#1E2A35] text-lg font-semibold">Financial metrics</p>
        <p className="text-[#8A7E6E] text-sm mt-2 max-w-md mx-auto">
          Revenue, collections, and payment trends will appear here.
        </p>
      </div>
    </div>
  );
}
