/** Shared calendar chrome for clearer grids (Balansé palette). */
export const CALENDAR_BORDER_DIVIDER = 'border-[#B8AB93]/80';
export const CALENDAR_BORDER_DIVIDER_SOFT = 'border-[#D4CDB5]/40';
export const CALENDAR_GRID_HOUR_LINE = 'border-t border-[#C4B8A8]/28';
export const CALENDAR_GRID_HALF_HOUR_LINE = 'border-t border-dashed border-[#D4CDB5]/38';
export const CALENDAR_TIME_GUTTER_BG = 'bg-[#F0EBE0]';
export const CALENDAR_TIME_LABEL = 'text-[#4A443C] font-semibold';
export const CALENDAR_DAY_LABEL = 'text-[#5A5048] font-semibold';
export const CALENDAR_DATE_MUTED = 'text-[#6B6358]';
export const CALENDAR_TODAY_COLUMN = 'shadow-[inset_0_0_0_2px_#b8862a]';
export const CALENDAR_TODAY_RING = 'ring-2 ring-[#b8862a]';

/** Day side panel timeline — stronger time legibility on cream sheet. */
export const CALENDAR_PANEL_TIME_GUTTER =
  'bg-[#EDE8D8] border-r border-[#B8AB93]/60 rounded-l-lg';
export const CALENDAR_PANEL_TIME_LABEL =
  'text-[#1E2A35] text-xs font-semibold tabular-nums tracking-tight';
export const CALENDAR_PANEL_TIME_META = 'text-[#5A5048] font-medium tabular-nums';
export const CALENDAR_PANEL_TIMELINE_SURFACE =
  'border border-[#B8AB93]/55 bg-[#FFFCF5]';
export const CALENDAR_PANEL_GRID_HOUR = 'border-t border-[#B8AB93]/40';
export const CALENDAR_PANEL_GRID_HALF_HOUR =
  'border-t border-dashed border-[#C4B8A8]/55';
export const CALENDAR_PANEL_HOVER_SLOT =
  'border border-[#1E2A35]/40 bg-[#1E2A35]/[0.09] shadow-[inset_3px_0_0_0_#1E2A35]';
export const CALENDAR_PANEL_HOVER_TIME =
  'text-[#1E2A35] text-[11px] font-bold tabular-nums';
export const CALENDAR_PANEL_FILTER_LABEL =
  'text-[#5A5048] text-[10px] font-bold uppercase tracking-wide shrink-0';
export const CALENDAR_PANEL_FILTER_SELECT =
  'border-[#B8AB93]/80 bg-white text-[#1E2A35] text-[11px] font-bold';

/** WCAG-style relative luminance; above ~0.58 reads as a light fill. */
const CALENDAR_FILL_LIGHT_THRESHOLD = 0.58;

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function parseCssColorToRgb(color: string): { r: number; g: number; b: number } | null {
  const trimmed = color.trim();
  const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((ch) => ch + ch)
        .join('');
    }
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    };
  }

  const hslMatch = trimmed.match(
    /^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/i,
  );
  if (hslMatch) {
    return hslToRgb(
      Number(hslMatch[1]),
      Number(hslMatch[2]) / 100,
      Number(hslMatch[3]) / 100,
    );
  }

  return null;
}

function srgbChannel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function calendarFillRelativeLuminance(color: string): number {
  const rgb = parseCssColorToRgb(color);
  if (!rgb) return 0.3;
  const r = srgbChannel(rgb.r);
  const g = srgbChannel(rgb.g);
  const b = srgbChannel(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isLightCalendarFill(color: string): boolean {
  return calendarFillRelativeLuminance(color) >= CALENDAR_FILL_LIGHT_THRESHOLD;
}
