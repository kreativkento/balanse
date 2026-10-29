import { useEffect, useId, useRef, useState } from 'react';
import { INFO } from '../../../lib/balanse-flow/info';

export function CardInfoButton({ title }: { title: string }) {
  const copy = INFO[title];
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!copy) return null;

  return (
    <span ref={rootRef} className="relative inline-flex" data-info-title={title}>
      <button
        type="button"
        aria-label={`About ${title}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#D4CDB5] text-[10px] font-bold text-[#8A7E6E] hover:bg-[#EDE8D8]"
      >
        i
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-6 z-30 w-56 rounded-xl border border-[#D4CDB5]/70 bg-white p-3 text-left shadow-sm"
        >
          <span className="block text-[11px] font-semibold text-[#1E2A35]">What it is</span>
          <span className="mt-0.5 block text-[11px] text-[#5A5048]">{copy.about}</span>
          <span className="mt-2 block text-[11px] font-semibold text-[#1E2A35]">What it's for</span>
          <span className="mt-0.5 block text-[11px] text-[#5A5048]">{copy.purpose}</span>
        </span>
      ) : null}
    </span>
  );
}
