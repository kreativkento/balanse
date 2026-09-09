/** Hour of day (0–23) in Asia/Manila (Philippines). */
export function getPhilippinesHour(now: Date = new Date()): number {
  const hourPart = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    hourCycle: 'h23',
  })
    .formatToParts(now)
    .find((part) => part.type === 'hour')?.value;

  return Number(hourPart ?? 0);
}

/** Time-of-day greeting based on Philippines local time. */
export function getPhilippinesGreeting(now: Date = new Date()): string {
  const hour = getPhilippinesHour(now);
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** File stamp like 2026-09-09-0855AM in Asia/Manila. */
export function formatPhilippinesSignedFileStamp(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(now);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  const year = value('year');
  const month = value('month');
  const day = value('day');
  const hour = value('hour').padStart(2, '0');
  const minute = value('minute').padStart(2, '0');
  const period = value('dayPeriod').replace(/\./g, '').replace(/\s/g, '').toUpperCase();
  return `${year}-${month}-${day}-${hour}${minute}${period}`;
}
