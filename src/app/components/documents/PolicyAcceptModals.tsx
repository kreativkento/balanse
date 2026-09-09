import { useState, type UIEvent } from 'react';
import {
  Check, Eye, FileText, Loader2, ShieldCheck, X,
} from 'lucide-react';
import { PRIVACY_BLOCKS, PRIVACY_LAST_UPDATED } from '../../data/privacyPolicy';
import { TC_LAST_UPDATED, TERMS_BLOCKS, type TermsBlock } from '../../data/termsAndConditions';

function PolicyBlocksView({ blocks }: { blocks: TermsBlock[] }) {
  return (
    <div className="space-y-4 text-sm text-[#5A5048] leading-relaxed">
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          return <p key={i} className="font-semibold text-[#1E2A35] mb-1">{block.text}</p>;
        }
        if (block.type === 'labelValue') {
          return <p key={i}>{block.label}: {block.value}</p>;
        }
        if (block.type === 'bullets') {
          return (
            <ul key={i} className="list-disc pl-5 space-y-2">
              {block.items.map((item) => (
                <li key={item.label}><span className="font-semibold text-[#1E2A35]">{item.label}</span> {item.text}</li>
              ))}
            </ul>
          );
        }
        if (block.type === 'numbered') {
          return (
            <ol key={i} className="list-decimal pl-5 space-y-3">
              {block.items.map((item) => <li key={item.slice(0, 24)}>{item}</li>)}
            </ol>
          );
        }
        return <p key={i}>{block.text}</p>;
      })}
    </div>
  );
}

export function TermsModal({
  onClose,
  onAccept,
}: {
  onClose: () => void;
  onAccept: () => void | Promise<void>;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40) setScrolled(true);
  };

  const confirmAccept = async () => {
    if (!accepted || saving) return;
    setSaving(true);
    setError('');
    try {
      await onAccept();
    } catch (err) {
      console.error('Failed to accept Terms & Conditions:', err);
      setError('Could not save your terms acceptance. Check internet connection, or try again later.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4" style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-[#D4CDB5]/50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#c49a3c]/10 border border-[#c49a3c]/30 flex items-center justify-center shrink-0">
              <FileText size={16} className="text-[#c49a3c]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[#1E2A35] truncate" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '0.05em' }}>
                Balansé Terms & Conditions
              </h3>
              <p className="text-[#9A8E7E] text-xs">Last Updated: {TC_LAST_UPDATED}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all shrink-0 disabled:opacity-50"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-5 sm:px-7 py-5 max-h-[46vh] overflow-y-auto flex-1 min-h-0" onScroll={handleScroll}>
          <PolicyBlocksView blocks={TERMS_BLOCKS} />

          <div className="mt-4 bg-[#F8F3E8] border border-[#D4CDB5]/60 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Eye size={14} className="text-[#c49a3c] shrink-0" />
            <p className="text-[#8A7E6E] text-xs">You can download this signed agreement as a PDF anytime from your Profile page.</p>
          </div>
        </div>

        {!scrolled && (
          <p className="text-[#B0A898] text-xs text-center py-2 shrink-0">Scroll to read all terms</p>
        )}

        <div className="px-5 sm:px-7 pb-6 sm:pb-7 flex flex-col gap-3 shrink-0">
          <label
            onClick={() => scrolled && !saving && setAccepted(v => !v)}
            className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${accepted ? 'border-[#c49a3c]/60 bg-[#c49a3c]/06' : scrolled ? 'border-[#D4CDB5]/60 hover:border-[#c49a3c]/30' : 'border-[#D4CDB5]/40 opacity-50 cursor-not-allowed'}`}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${accepted ? 'bg-[#c49a3c] border-[#c49a3c]' : 'border-[#D4CDB5]'}`}>
              {accepted && <Check size={12} className="text-white" strokeWidth={3} />}
            </div>
            <p className="text-[#5A5048] text-xs leading-relaxed">
              I have read the above Waiver &amp; Release form and Media Release &amp; Consent Statement, fully understand and agree to its contents.
            </p>
          </label>
          {error ? (
            <p className="text-red-600 text-xs text-center">{error}</p>
          ) : null}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { void confirmAccept(); }}
              disabled={!accepted || saving}
              className={`flex-1 py-3 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 ${accepted && !saving ? 'bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97]' : 'bg-[#EDE8D8] text-[#9A8E7E] cursor-not-allowed'}`}
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Saving…' : 'I Accept'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrivacyModal({
  onClose,
  onAccept,
}: {
  onClose: () => void;
  onAccept: () => void | Promise<void>;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40) setScrolled(true);
  };

  const confirmAccept = async () => {
    if (!accepted || saving) return;
    setSaving(true);
    setError('');
    try {
      await onAccept();
    } catch (err) {
      console.error('Failed to accept Privacy Policy:', err);
      setError('Could not save your Privacy Policy acceptance. Check internet connection, or try again later.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4" style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-[#D4CDB5]/50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#c49a3c]/10 border border-[#c49a3c]/30 flex items-center justify-center shrink-0">
              <ShieldCheck size={16} className="text-[#c49a3c]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[#1E2A35] truncate" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '0.05em' }}>
                Privacy Policy
              </h3>
              <p className="text-[#9A8E7E] text-xs">Last Updated: {PRIVACY_LAST_UPDATED}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all shrink-0 disabled:opacity-50"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-5 sm:px-7 py-5 max-h-[46vh] overflow-y-auto flex-1 min-h-0" onScroll={handleScroll}>
          <PolicyBlocksView blocks={PRIVACY_BLOCKS} />
        </div>

        {!scrolled && (
          <p className="text-[#B0A898] text-xs text-center py-2 shrink-0">Scroll to read the full policy</p>
        )}

        <div className="px-5 sm:px-7 pb-6 sm:pb-7 flex flex-col gap-3 shrink-0">
          <label
            onClick={() => scrolled && !saving && setAccepted(v => !v)}
            className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${accepted ? 'border-[#c49a3c]/60 bg-[#c49a3c]/06' : scrolled ? 'border-[#D4CDB5]/60 hover:border-[#c49a3c]/30' : 'border-[#D4CDB5]/40 opacity-50 cursor-not-allowed'}`}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${accepted ? 'bg-[#c49a3c] border-[#c49a3c]' : 'border-[#D4CDB5]'}`}>
              {accepted && <Check size={12} className="text-white" strokeWidth={3} />}
            </div>
            <p className="text-[#5A5048] text-xs leading-relaxed">
              I have read this Privacy Policy and understand how BALANSÉ collects and uses my information.
            </p>
          </label>
          {error ? (
            <p className="text-red-600 text-xs text-center">{error}</p>
          ) : null}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { void confirmAccept(); }}
              disabled={!accepted || saving}
              className={`flex-1 py-3 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 ${accepted && !saving ? 'bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97]' : 'bg-[#EDE8D8] text-[#9A8E7E] cursor-not-allowed'}`}
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Saving…' : 'I Accept'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
