/** Calendar color pill — overlay on cover photo or plain on ID card panel. */
export function DisciplineCalendarColorBadge({
  hex,
  placeholder = false,
  tone = 'overlay',
  className = '',
}: {
  hex?: string;
  placeholder?: boolean;
  tone?: 'overlay' | 'plain';
  className?: string;
}) {
  const isPlain = tone === 'plain';

  if (placeholder || !hex) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full border border-dashed px-2.5 py-1 min-w-[4.5rem] h-[22px] ${
          isPlain
            ? 'border-[#c49a3c]/50 bg-[#F8F3E8] text-[#9A8E7E]'
            : 'border-white/45 bg-black/25 backdrop-blur-sm text-white/85'
        } ${className}`}
        aria-label="No calendar color selected"
      >
        <span className="text-[10px] font-semibold leading-none tracking-wide">Select color</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-block rounded-full shadow-sm min-w-[2.75rem] h-[22px] px-2.5 py-1 ${
        isPlain ? 'border border-[#D4CDB5]/80' : 'border border-white/30'
      } ${className}`}
      style={{ backgroundColor: hex }}
      aria-label={`Calendar color ${hex}`}
      title={hex}
    />
  );
}
