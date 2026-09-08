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
