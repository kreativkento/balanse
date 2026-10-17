/** Shared floating panel chrome for clock-style pickers. */
export const PICKER_PANEL_CLASS =
  'z-[200] w-[var(--radix-popover-trigger-width)] rounded-2xl border-2 border-[#2563eb]/35 bg-white shadow-xl p-4 outline-none';

export const PICKER_TRIGGER_CLASS =
  'w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm font-semibold outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all disabled:opacity-50';

export const PICKER_LABEL_CLASS =
  'block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5';

export function pickerGridCellClass(selected: boolean): string {
  return selected
    ? 'bg-[#2563eb] text-white shadow-sm'
    : 'text-[#5A5048] hover:bg-[#EDE8D8]';
}
