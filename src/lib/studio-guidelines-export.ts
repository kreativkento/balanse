import { jsPDF } from 'jspdf';
import {
  GUIDELINE_SECTIONS,
  GUIDELINES_DOCUMENT_TITLE,
  GUIDELINES_FILE_NAME,
  GUIDELINES_IMAGE_FILE_NAME,
  GUIDELINES_INTRO,
  GUIDELINES_LAST_UPDATED,
} from '../app/data/studioGuidelines';

const CREAM = '#F8F3E8';
const NAVY = '#1E2A35';
const GOLD = '#c49a3c';
const MUTED = '#8A7E6E';
const BODY = '#5A5048';
const CARD = '#FFFFFF';
const BORDER = '#D4CDB5';
const ICON_WASH = 'rgba(196, 154, 60, 0.10)';

const WIDTH = 1200;
const SCALE = 2;
const PAD = 52;
const GAP = 22;
const COLS = 2;
const GOLD_BAR = 10;
const ICON_BOX = 48;

const ICON_SVG: Record<string, string> = {
  'Arriving on time':
    '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'What to wear & bring':
    '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
  'Studio care':
    '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  'Shared space':
    '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
  'Booking & cancellation':
    '<path d="M2 21a8 8 0 0 1 13.292-6"/><circle cx="10" cy="8" r="5"/><path d="m16 19 2 2 4-4"/>',
  'Safety first':
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  'Photos & devices':
    '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
  Community:
    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"/><path d="m18 15-2-2"/><path d="m15 18-2-2"/>',
};

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

function loadIcon(title: string, size: number): Promise<HTMLImageElement> {
  const inner = ICON_SVG[title] ?? '';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${GOLD}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not render icon for ${title}`));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

async function renderGuidelinesInfographic(): Promise<HTMLCanvasElement> {
  await document.fonts.ready.catch(() => undefined);
  await Promise.allSettled([
    document.fonts.load('64px "Bebas Neue"'),
    document.fonts.load('15px Inter'),
  ]);

  const cardW = (WIDTH - PAD * 2 - GAP) / COLS;
  const cardPad = 26;
  const bodyMaxW = cardW - cardPad * 2;
  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) throw new Error('Canvas is not available in this browser.');
  measure.font = '15px Inter, system-ui, sans-serif';
  const lineHeight = 22;
  const maxLines = Math.max(
    ...GUIDELINE_SECTIONS.map((section) => wrapText(measure, section.body, bodyMaxW).length),
    1,
  );
  const cardH = cardPad + ICON_BOX + 14 + 26 + maxLines * lineHeight + cardPad;
  const rows = Math.ceil(GUIDELINE_SECTIONS.length / COLS);
  const headerH = 228;
  const footerH = 64;
  const height = GOLD_BAR + PAD + headerH + rows * cardH + (rows - 1) * GAP + footerH + PAD + GOLD_BAR;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(WIDTH * SCALE);
  canvas.height = Math.round(height * SCALE);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 0, WIDTH, GOLD_BAR);
  ctx.fillRect(0, height - GOLD_BAR, WIDTH, GOLD_BAR);

  ctx.fillStyle = GOLD;
  ctx.font = '20px "Bebas Neue", sans-serif';
  ctx.letterSpacing = '0.18em';
  ctx.fillText('BALANSÉ', PAD, GOLD_BAR + PAD + 12);

  ctx.fillStyle = MUTED;
  ctx.font = '600 11px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '0.22em';
  ctx.fillText('CLASS MANAGEMENT', PAD, GOLD_BAR + PAD + 42);

  ctx.fillStyle = NAVY;
  ctx.font = '64px "Bebas Neue", sans-serif';
  ctx.letterSpacing = '0.04em';
  ctx.fillText(GUIDELINES_DOCUMENT_TITLE.toUpperCase(), PAD, GOLD_BAR + PAD + 112);

  ctx.fillStyle = MUTED;
  ctx.font = '15px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '0px';
  const introLines = wrapText(ctx, GUIDELINES_INTRO, WIDTH - PAD * 2);
  introLines.forEach((line, i) => {
    ctx.fillText(line, PAD, GOLD_BAR + PAD + 148 + i * 20);
  });

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD, GOLD_BAR + PAD + headerH - 18);
  ctx.lineTo(WIDTH - PAD, GOLD_BAR + PAD + headerH - 18);
  ctx.stroke();

  const icons = await Promise.all(GUIDELINE_SECTIONS.map((section) => loadIcon(section.title, 64)));
  const gridTop = GOLD_BAR + PAD + headerH;

  GUIDELINE_SECTIONS.forEach((section, index) => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const x = PAD + col * (cardW + GAP);
    const y = gridTop + row * (cardH + GAP);

    ctx.save();
    ctx.shadowColor = 'rgba(30, 42, 53, 0.08)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = CARD;
    roundRectPath(ctx, x, y, cardW, cardH, 24);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(212, 205, 181, 0.9)';
    ctx.lineWidth = 1;
    roundRectPath(ctx, x, y, cardW, cardH, 24);
    ctx.stroke();

    ctx.fillStyle = GOLD;
    roundRectPath(ctx, x, y + 22, 5, cardH - 44, 3);
    ctx.fill();

    ctx.fillStyle = ICON_WASH;
    roundRectPath(ctx, x + cardPad, y + cardPad, ICON_BOX, ICON_BOX, 12);
    ctx.fill();
    ctx.drawImage(icons[index], x + cardPad + 10, y + cardPad + 10, 28, 28);

    ctx.fillStyle = 'rgba(196, 154, 60, 0.28)';
    ctx.font = '42px "Bebas Neue", sans-serif';
    ctx.letterSpacing = '0.04em';
    ctx.textAlign = 'right';
    ctx.fillText(String(index + 1).padStart(2, '0'), x + cardW - cardPad, y + cardPad + 34);
    ctx.textAlign = 'left';

    ctx.fillStyle = NAVY;
    ctx.font = '26px "Bebas Neue", sans-serif';
    ctx.letterSpacing = '0.05em';
    ctx.fillText(section.title.toUpperCase(), x + cardPad + ICON_BOX + 14, y + cardPad + 32);

    ctx.fillStyle = BODY;
    ctx.font = '15px Inter, system-ui, sans-serif';
    ctx.letterSpacing = '0px';
    const bodyY = y + cardPad + ICON_BOX + 36;
    wrapText(ctx, section.body, bodyMaxW).forEach((line, lineIndex) => {
      ctx.fillText(line, x + cardPad, bodyY + lineIndex * lineHeight);
    });
  });

  const footerY = height - GOLD_BAR - PAD + 8;
  ctx.strokeStyle = 'rgba(212, 205, 181, 0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, footerY - 28);
  ctx.lineTo(WIDTH - PAD, footerY - 28);
  ctx.stroke();

  ctx.fillStyle = NAVY;
  ctx.font = '18px "Bebas Neue", sans-serif';
  ctx.letterSpacing = '0.12em';
  ctx.fillText('BALANSÉ WELLNESS HUB', PAD, footerY);

  ctx.fillStyle = MUTED;
  ctx.font = '600 12px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '0.08em';
  ctx.textAlign = 'right';
  ctx.fillText(`LAST UPDATED ${GUIDELINES_LAST_UPDATED.toUpperCase()}`, WIDTH - PAD, footerY);
  ctx.textAlign = 'left';

  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not create the download file.'));
    }, type);
  });
}

export async function downloadStudioGuidelinesPdf(): Promise<void> {
  const canvas = await renderGuidelinesInfographic();
  const dataUrl = canvas.toDataURL('image/png');
  const pdfW = 612;
  const pdfH = (canvas.height / canvas.width) * pdfW;
  const doc = new jsPDF({
    unit: 'pt',
    format: [pdfW, pdfH],
    orientation: pdfH >= pdfW ? 'portrait' : 'landscape',
  });
  doc.addImage(dataUrl, 'PNG', 0, 0, pdfW, pdfH, undefined, 'FAST');
  doc.save(GUIDELINES_FILE_NAME);
}

export async function downloadStudioGuidelinesImage(): Promise<void> {
  const canvas = await renderGuidelinesInfographic();
  const blob = await canvasToBlob(canvas, 'image/png');
  triggerDownload(blob, GUIDELINES_IMAGE_FILE_NAME);
}
