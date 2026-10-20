import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, Mail, Printer, X } from 'lucide-react';
import {
  fetchClassPaymentReceiptHtml,
  markClassPaymentReceiptPrinted,
} from '../../../lib/class-payment-service';
import { wrapReceiptHtmlForOverlayPreview } from '../../../lib/class-payment-receipt-html';

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
  const [previewFrameHeight, setPreviewFrameHeight] = useState<number | null>(null);
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
    const iframe = previewRef.current;
    const doc = iframe.contentDocument;
    if (!doc) return;

    const previewHtml = wrapReceiptHtmlForOverlayPreview(html);
    doc.open();
    doc.write(previewHtml);
    doc.close();

    const fitPreview = () => {
      const contentH = Math.max(
        doc.documentElement?.scrollHeight ?? 0,
        doc.body?.scrollHeight ?? 0,
      );
      if (contentH <= 0) return;

      const paperWidth = 560;
      iframe.style.width = `${paperWidth}px`;
      iframe.style.maxWidth = '100%';
      iframe.style.height = `${contentH}px`;
      iframe.style.transform = 'none';

      const reservedVertical = 240;
      const maxH = window.innerHeight - reservedVertical;
      if (contentH > maxH && maxH > 160) {
        const scale = maxH / contentH;
        iframe.style.transform = `scale(${scale})`;
        iframe.style.transformOrigin = 'top center';
        setPreviewFrameHeight(Math.ceil(contentH * scale));
      } else {
        setPreviewFrameHeight(contentH);
      }
    };

    requestAnimationFrame(fitPreview);
    window.addEventListener('resize', fitPreview);
    return () => window.removeEventListener('resize', fitPreview);
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

  const overlayBtn =
    'py-3 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 border border-white/25 text-white hover:bg-white/10';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-hidden"
      style={{ backgroundColor: 'rgba(18, 26, 34, 0.88)', backdropFilter: 'blur(8px)' }}
      role="presentation"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="fixed top-4 right-4 z-[61] w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
        aria-label="Close receipt preview"
      >
        <X size={20} />
      </button>

      <div
        className="relative w-full max-w-[540px] flex flex-col items-center gap-5 my-auto"
        role="dialog"
        aria-labelledby="receipt-preview-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="text-center shrink-0 pt-2">
          <p className="text-white/65 text-xs uppercase tracking-[0.2em] mb-1">Official Receipt</p>
          <h3
            id="receipt-preview-title"
            className="text-white"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em' }}
          >
            {paymentUid}
          </h3>
        </header>

        {emailSent && (
          <div className="flex items-start gap-2 text-center max-w-md shrink-0">
            <Mail size={14} className="text-emerald-300 shrink-0 mt-0.5" />
            <p className="text-emerald-100/90 text-sm">
              E-receipt sent to <span className="font-semibold text-white">{studentEmail}</span>
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-white/70 text-sm">
            <Loader2 size={18} className="animate-spin" />
            Loading receipt…
          </div>
        )}

        {!loading && loadError && (
          <p className="text-red-300 text-sm text-center py-8 max-w-sm">{loadError}</p>
        )}

        {!loading && html && (
          <div
            className="w-full max-w-[560px] overflow-hidden flex justify-center shrink-0"
            style={previewFrameHeight != null ? { height: previewFrameHeight } : undefined}
          >
            <iframe
              ref={previewRef}
              title="Receipt preview"
              className="block border-0 bg-transparent shadow-[0_12px_48px_rgba(0,0,0,0.45)]"
              sandbox="allow-same-origin"
              scrolling="no"
            />
          </div>
        )}

        <div className="flex gap-3 w-full max-w-md shrink-0 pb-2">
          <button type="button" onClick={onClose} className={`flex-1 ${overlayBtn}`}>
            Close
          </button>
          <button
            type="button"
            disabled={!html || printing}
            onClick={handleDownload}
            className={`flex-1 ${overlayBtn}`}
          >
            Download
          </button>
          <button
            type="button"
            disabled={!html || printing}
            onClick={() => void handlePrint()}
            className="action-button flex-[1.2] py-3 rounded-full bg-[#c49a3c] text-[#1E2A35] hover:bg-[#d4ab4d] transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 font-bold text-sm"
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
