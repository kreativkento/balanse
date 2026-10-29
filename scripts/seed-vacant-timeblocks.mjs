/**
 * Seed vacant class timeblocks for manual / automated testing.
 *
 * Does nothing until you run it. Safe to re-run: a slot that overlaps an
 * existing class is skipped.
 *
 * Each block is vacant, closed for enrollment, with no discipline, coach,
 * students, or class limit. Duration is 1 hour 30 minutes. The day window
 * is 09:00–21:00 Asia/Manila, filled back to back:
 *   09:00–10:30, 10:30–12:00, 12:00–13:30, 13:30–15:00,
 *   15:00–16:30, 16:30–18:00, 18:00–19:30, 19:30–21:00.
 *
 * Dates (Asia/Manila, based on the clock when the script starts):
 *   - the next 7 days, starting tomorrow
 *   - the calendar day 16 days after today
 *
 * From the project root:
 *   npm run seed:timeblocks
 *
 * Requires VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SEED_ADMIN_EMAIL,
 * and SEED_ADMIN_PASSWORD (an admin or dev account). Values already in the
 * environment win; otherwise they are read from .env.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const MANILA_OFFSET = '+08:00';
const WINDOW_START_MINUTES = 9 * 60;
const WINDOW_END_MINUTES = 21 * 60;
const DURATION_MINUTES = 90;
const WEEK_LENGTH_DAYS = 7;
const EXTRA_DAY_OFFSET = 16;

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

function manilaTodayKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function manilaInstant(dateKey, minutes, seconds = 0) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return new Date(`${dateKey}T${hh}:${mm}:${ss}${MANILA_OFFSET}`);
}

function clockLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function seedDates(todayKey) {
  const week = Array.from({ length: WEEK_LENGTH_DAYS }, (_, index) => addDays(todayKey, index + 1));
  const extra = addDays(todayKey, EXTRA_DAY_OFFSET);
  return {
    week,
    extra,
    days: week.includes(extra) ? week : [...week, extra],
  };
}

function plannedSlots(dateKey) {
  const slots = [];
  for (
    let start = WINDOW_START_MINUTES;
    start + DURATION_MINUTES <= WINDOW_END_MINUTES;
    start += DURATION_MINUTES
  ) {
    const end = start + DURATION_MINUTES;
    slots.push({
      dateKey,
      label: `${dateKey} ${clockLabel(start)}–${clockLabel(end)}`,
      startsAt: manilaInstant(dateKey, start),
      endsAt: manilaInstant(dateKey, end),
    });
  }
  return slots;
}

function occupiedEndMs(row) {
  if (row.ends_at) return Date.parse(row.ends_at);
  return Date.parse(row.starts_at) + 60 * 60 * 1000;
}

function overlaps(slot, occupied) {
  const start = slot.startsAt.getTime();
  const end = slot.endsAt.getTime();
  return occupied.some((block) => block.start < end && block.end > start);
}

async function loadOccupied(supabase, rangeStart, rangeEnd) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('classes')
      .select('id, starts_at, ends_at')
      .gte('starts_at', rangeStart.toISOString())
      .lt('starts_at', rangeEnd.toISOString())
      .order('starts_at', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Could not read existing classes: ${error.message}`);
    }

    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return rows.map((row) => ({
    id: row.id,
    start: Date.parse(row.starts_at),
    end: occupiedEndMs(row),
  }));
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Set it in the environment or in .env.`);
  }
  return value;
}

async function main() {
  loadDotEnv(resolve(process.cwd(), '.env'));

  const url = requireEnv('VITE_SUPABASE_URL');
  const anonKey = requireEnv('VITE_SUPABASE_ANON_KEY');
  const email = requireEnv('SEED_ADMIN_EMAIL');
  const password = requireEnv('SEED_ADMIN_PASSWORD');

  const todayKey = manilaTodayKey();
  const { week, extra, days } = seedDates(todayKey);
  const slots = days.flatMap(plannedSlots);
  const rangeStart = manilaInstant(addDays(days[0], -1), 0);
  const rangeEnd = manilaInstant(days[days.length - 1], WINDOW_END_MINUTES);

  console.log(`Today (Asia/Manila): ${todayKey}`);
  console.log(`Week starting tomorrow: ${week[0]} through ${week[week.length - 1]}`);
  console.log(`Extra day (today + ${EXTRA_DAY_OFFSET}): ${extra}`);
  console.log(`Slots per day: ${slots.length / days.length} × ${DURATION_MINUTES} min, 09:00–21:00`);
  console.log(`Planned: ${slots.length}`);

  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`Admin sign-in failed: ${signInError.message}`);
  }

  const occupied = await loadOccupied(supabase, rangeStart, rangeEnd);
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const slot of slots) {
    if (overlaps(slot, occupied)) {
      skipped += 1;
      console.log(`skipped  ${slot.label}  already occupied`);
      continue;
    }

    const { data, error } = await supabase.rpc('admin_create_class', {
      p_starts_at: slot.startsAt.toISOString(),
      p_ends_at: slot.endsAt.toISOString(),
      p_class_limit: null,
      p_status_class: false,
      p_status_block: 'vacant',
      p_name: '',
      p_description: '',
      p_discipline_id: null,
      p_coach_account_ids: [],
      p_student_account_ids: [],
    });

    if (error) {
      if (/overlap/i.test(error.message)) {
        skipped += 1;
        console.log(`skipped  ${slot.label}  ${error.message}`);
        continue;
      }
      failed += 1;
      console.error(`failed   ${slot.label}  ${error.message}`);
      continue;
    }

    occupied.push({
      id: data,
      start: slot.startsAt.getTime(),
      end: slot.endsAt.getTime(),
    });
    created += 1;
    console.log(`created  ${slot.label}  ${data}`);
  }

  console.log(`Created ${created}, skipped ${skipped}, failed ${failed}.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
