import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Bot } from 'lucide-react';
import { useDevAuth } from '../context/DevAuthContext';
import { DevSidebar } from '../components/layout/DevSidebar';

export default function DevAiSetupPage() {
  const navigate = useNavigate();
  const { devUser } = useDevAuth();

  useEffect(() => {
    if (!devUser) navigate('/development');
  }, [devUser, navigate]);

  if (!devUser) return null;

  return (
    <DevSidebar>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 bg-[#1E2A35]/08 border border-[#1E2A35]/15 rounded-full px-3 py-1 mb-3">
            <Bot size={11} className="text-[#c49a3c]" />
            <span className="text-[#1E2A35] text-xs font-bold uppercase tracking-widest">AI Setup</span>
          </div>
          <h1
            className="text-[#1E2A35]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 4vw, 2.8rem)', letterSpacing: '0.04em', lineHeight: 1 }}
          >
            AI Setup
          </h1>
          <p className="text-[#B0A898] text-xs mt-1.5">Configure AI tooling and integrations.</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E2D2]/80 px-6 py-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#EDE8D8] flex items-center justify-center mx-auto mb-4">
            <Bot size={24} className="text-[#8A7E6E]" />
          </div>
          <p className="text-[#1E2A35] font-semibold mb-1">Coming soon</p>
          <p className="text-[#8A7E6E] text-sm">AI configuration options will appear here.</p>
        </div>
      </div>
    </DevSidebar>
  );
}
