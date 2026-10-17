import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronRight, Loader2, Palette, X } from 'lucide-react';
import {
  listDefaultColorSwatches,
  normalizeDisciplineColorHex,
  type DefaultColorSwatch,
} from '../../../lib/default-assets';

export function DisciplineColorPicker({
  value,
  onChange,
  disabled = false,
  seedIfMissing = false,
  required = false,
}: {
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  seedIfMissing?: boolean;
  required?: boolean;
}) {
  const dialogTitleId = useId();
  const [swatches, setSwatches] = useState<DefaultColorSwatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [popupOpen, setPopupOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customHexDraft, setCustomHexDraft] = useState('');
  const nativeColorRef = useRef<HTMLInputElement>(null);
  const selected = normalizeDisciplineColorHex(value);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listDefaultColorSwatches({ seedIfMissing }).then((rows) => {
      if (cancelled) return;
      setSwatches(rows.slice(0, 16));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [seedIfMissing]);

  useEffect(() => {
    if (!popupOpen) {
      setCustomOpen(false);
      return;
    }
    setCustomHexDraft(selected || '#64748B');
  }, [popupOpen, selected]);

  const pickSwatch = (hex: string) => {
    onChange(normalizeDisciplineColorHex(hex));
    setPopupOpen(false);
    setCustomOpen(false);
  };

  const applyCustom = () => {
    const normalized = normalizeDisciplineColorHex(customHexDraft);
    if (!normalized) return;
    onChange(normalized);
    setPopupOpen(false);
    setCustomOpen(false);
  };

  const nativePickerValue = (() => {
    const n = normalizeDisciplineColorHex(customHexDraft);
    return n || '#64748B';
  })();

  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Palette size={13} className="text-[#c49a3c]" />
          <p className="text-[#9A8E7E] text-xs uppercase tracking-widest">
            Calendar color
            {required && <span className="text-[#c49a3c] ml-0.5">*</span>}
          </p>
        </div>
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => setPopupOpen(true)}
          className="w-full flex items-center gap-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-4 py-3.5 text-left shadow-sm transition-all hover:border-[#c49a3c]/45 hover:bg-[#F8F3E8]/90 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin text-[#8A7E6E] shrink-0" />
              <span className="text-sm text-[#8A7E6E]">Loading colors…</span>
            </>
          ) : selected ? (
            <>
              <span
                className="h-11 w-11 shrink-0 rounded-xl border border-white shadow-md ring-1 ring-[#D4CDB5]/50"
                style={{ backgroundColor: selected }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A8E7E]">
                  Selected
                </p>
                <p className="text-[#1E2A35] text-sm font-semibold mt-0.5">{selected}</p>
              </div>
              <ChevronRight size={18} className="text-[#9A8E7E] shrink-0" />
            </>
          ) : (
            <>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-[#c49a3c]/50 bg-white/80 text-[#c49a3c]">
                <Palette size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[#1E2A35] text-sm font-semibold">Select color</p>
                <p className="text-[#B0A898] text-xs mt-0.5">
                  {required ? 'Required for new disciplines' : 'Choose a calendar accent'}
                </p>
              </div>
              <ChevronRight size={18} className="text-[#9A8E7E] shrink-0" />
            </>
          )}
        </button>
      </div>

      {popupOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(30,42,53,0.45)', backdropFilter: 'blur(3px)' }}
          onClick={() => setPopupOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="w-full max-w-[280px] rounded-2xl border border-[#D4CDB5]/70 bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p id={dialogTitleId} className="text-[#1E2A35] text-sm font-bold">
                  Calendar color
                </p>
                <p className="text-[#9A8E7E] text-[11px] mt-0.5">Pick a suggested swatch</p>
              </div>
              <button
                type="button"
                onClick={() => setPopupOpen(false)}
                className="w-8 h-8 rounded-full border border-[#D4CDB5]/60 flex items-center justify-center text-[#5A5048] hover:bg-[#F8F3E8]"
                aria-label="Close color picker"
              >
                <X size={16} />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-[#8A7E6E]">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs">Loading…</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {swatches.map((swatch) => {
                    const isSelected = selected === swatch.hex.toUpperCase();
                    return (
                      <button
                        key={swatch.path}
                        type="button"
                        title={swatch.name}
                        aria-label={`${swatch.name} ${swatch.hex}`}
                        aria-pressed={isSelected}
                        onClick={() => pickSwatch(swatch.hex)}
                        className={`relative aspect-square rounded-xl border-2 transition-all shadow-sm ${
                          isSelected
                            ? 'border-[#1E2A35] ring-2 ring-[#c49a3c]/45'
                            : 'border-white hover:border-[#1E2A35]/25 hover:scale-[1.03]'
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                      >
                        {isSelected && (
                          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#1E2A35] text-white">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCustomOpen((open) => !open)}
                  className="mt-4 w-full text-center text-xs font-semibold text-[#c49a3c] hover:text-[#a67f2e] transition-colors"
                >
                  Select Color
                </button>

                {customOpen && (
                  <div className="mt-3 pt-3 border-t border-[#D4CDB5]/50 space-y-3">
                    <p className="text-[11px] text-[#8A7E6E] leading-relaxed">
                      Custom hex or use the system color picker.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => nativeColorRef.current?.click()}
                        className="relative h-12 w-12 shrink-0 rounded-xl border border-[#D4CDB5]/70 shadow-inner overflow-hidden"
                        style={{ backgroundColor: nativePickerValue }}
                        aria-label="Open system color picker"
                      >
                        <input
                          ref={nativeColorRef}
                          type="color"
                          value={nativePickerValue}
                          onChange={(event) => setCustomHexDraft(event.target.value.toUpperCase())}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                      </button>
                      <input
                        type="text"
                        value={customHexDraft}
                        onChange={(event) => setCustomHexDraft(event.target.value)}
                        placeholder="#RRGGBB"
                        className="flex-1 min-w-0 rounded-xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-3 py-2.5 text-sm font-mono text-[#1E2A35] outline-none focus:ring-2 focus:ring-[#c49a3c]/30"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={applyCustom}
                      disabled={!normalizeDisciplineColorHex(customHexDraft)}
                      className="action-button w-full py-2.5 rounded-full bg-[#1E2A35] text-white text-xs font-bold hover:bg-[#263545] disabled:opacity-50"
                    >
                      Apply custom color
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
