import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PublicBreadcrumb } from '../components/layout/PublicBreadcrumb';
import AdminTimeBlockingPage from './AdminTimeBlockingPage';

export default function ClassesPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  const handlePublicBlockActivate = useCallback(() => {
    if (isAuthenticated) {
      navigate('/class-schedule');
      return;
    }
    setShowSignInPrompt(true);
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#F8F3E8]">
      {showSignInPrompt && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowSignInPrompt(false)}
          role="presentation"
        >
          <div
            className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-sm p-6"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="classes-sign-in-title"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#c49a3c]/12 border border-[#c49a3c]/25 flex items-center justify-center mb-4">
              <LogIn size={20} className="text-[#c49a3c]" />
            </div>
            <h2
              id="classes-sign-in-title"
              className="text-[#1E2A35] leading-none mb-2"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.05em' }}
            >
              Sign in to book
            </h2>
            <p className="text-[#8A7E6E] text-sm leading-relaxed mb-6">
              Create an account or sign in to enroll in a class from the live schedule.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowSignInPrompt(false)}
                className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 bg-white text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] transition-all"
              >
                Keep browsing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSignInPrompt(false);
                  navigate('/login', { state: { from: '/class-schedule' } });
                }}
                className="action-button flex-1 py-3 rounded-full bg-[#c49a3c] text-white text-sm font-bold hover:bg-[#a67f2e] transition-all"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-[#D4CDB5]/60 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-4">
          <PublicBreadcrumb parent="Our Classes" current="Class Schedules" parentTo="/classes" />
          <h1
            className="text-[#1E2A35] leading-none"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              letterSpacing: '0.05em',
            }}
          >
            Class Schedules
          </h1>
          <p className="text-[#8A7E6E] text-sm mt-2">
            Live studio calendar — tap a session to sign in and book.
          </p>
        </div>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        data-public-main-scroll
      >
        <AdminTimeBlockingPage
          key="public-class-schedule"
          variant="public-class-schedule"
          onPublicBlockActivate={handlePublicBlockActivate}
        />
      </div>
    </div>
  );
}
