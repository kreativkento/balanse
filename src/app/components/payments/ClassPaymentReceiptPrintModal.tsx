import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, Mail, Printer, X } from 'lucide-react';
import {
  fetchClassPaymentReceiptHtml,
  markClassPaymentReceiptPrinted,
} from '../../../lib/class-payment-service';

function printHtmlDocument(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Official receipt print');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument ?? win?.document;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };

  win.onload = () => {
    win.focus();
    win.print();
    window.setTimeout(cleanup, 1500);
  };
}

export function ClassPaymentReceiptPrintModal({
  paymentId,
  paymentUid,
  studentEmail,
  emailSent,
  onClose,
  onPrinted,
}: {
  paymentId: string;
  paymentUid: string;
  studentEmail: string;
  emailSent: boolean;
  onClose: () => void;
  onPrinted: (paymentId: string) => void;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      const { html: loaded, error } = await fetchClassPaymentReceiptHtml(paymentId);
      if (cancelled) return;
      if (error || !loaded) {
        setLoadError(error ?? 'Could not load e-receipt.');
        setHtml(null);
      } else {
        setHtml(loaded);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  useEffect(() => {
    if (!html || !previewRef.current) return;
    const doc = previewRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  const handlePrint = useCallback(async () => {
    if (!html) return;
    setPrinting(true);
    printHtmlDocument(html);
    const { ok, error } = await markClassPaymentReceiptPrinted(paymentId);
    if (!ok && error) {
      console.error('markClassPaymentReceiptPrinted:', error);
    }
    window.setTimeout(() => {
      onPrinted(paymentId);
      onClose();
      setPrinting(false);
    }, 800);
  }, [html, onClose, onPrinted, paymentId]);

  const handleDownload = useCallback(() => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${paymentUid.replace(/[^\w-]+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [html, paymentUid]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-lg my-4 flex flex-col max-h-[min(92vh,820px)]">
        <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-0.5">Official receipt</p>
            <h3
              className="text-[#1E2A35]"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}
            >
              {paymentUid}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-7 py-4 flex flex-col gap-3 min-h-0 flex-1 overflow-hidden">
          {emailSent && (
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 shrink-0">
              <Mail size={14} className="text-green-600 shrink-0 mt-0.5" />
              <p className="text-green-700 text-sm">
                E-receipt sent to <span className="font-semibold">{studentEmail}</span>
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-[#8A7E6E] text-sm">
              <Loader2 size={18} className="animate-spin" />
              Loading receipt…
            </div>
          )}

          {!loading && loadError && (
            <p className="text-red-600 text-sm text-center py-8">{loadError}</p>
          )}

          {!loading && html && (
            <div className="rounded-2xl border border-[#D4CDB5]/50 bg-[#eceae4] overflow-hidden flex-1 min-h-[280px]">
              <iframe
                ref={previewRef}
                title="Receipt preview"
                className="w-full h-full min-h-[280px] border-0 bg-[#eceae4]"
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>

        <div className="px-7 pb-7 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all"
          >
            Close
          </button>
          <button
            type="button"
            disabled={!html || printing}
            onClick={handleDownload}
            className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] transition-all disabled:opacity-50"
          >
            Download
          </button>
          <button
            type="button"
            disabled={!html || printing}
            onClick={() => void handlePrint()}
            className="action-button flex-[1.2] py-3 rounded-full bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {printing ? (
              <>
                <Check size={15} /> Printing…
              </>
            ) : (
              <>
                <Printer size={14} /> Print
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
