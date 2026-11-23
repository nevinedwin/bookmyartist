import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

/** Business timezone. Data is stored in UTC and rendered in this zone. */
export const BUSINESS_TZ = "Asia/Kolkata";

export function toBusinessTime(date: Date | string | number): TZDate {
  return new TZDate(new Date(date), BUSINESS_TZ);
}

/** e.g. "14 Feb 2027" */
export function formatDate(date: Date | string | number): string {
  return format(toBusinessTime(date), "d MMM yyyy");
}

/** e.g. "14 Feb 2027, 7:30 pm" */
export function formatDateTime(date: Date | string | number): string {
  return format(toBusinessTime(date), "d MMM yyyy, h:mm aaa");
}

/** e.g. "7:30 pm" */
export function formatTime(date: Date | string | number): string {
  return format(toBusinessTime(date), "h:mm aaa");
}

/** Calendar year in the business timezone (used for reference numbering). */
export function businessYear(date: Date = new Date()): number {
  return toBusinessTime(date).getFullYear();
}

/** Today's calendar date in the business timezone as YYYY-MM-DD. */
export function businessToday(now: Date = new Date()): string {
  return format(toBusinessTime(now), "yyyy-MM-dd");
}

/**
 * Convert a YYYY-MM-DD calendar date to the UTC midnight Date Prisma expects
 * for `@db.Date` columns (dates carry no timezone).
 */
export function calendarDateToUtc(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new RangeError(`Invalid calendar date: ${date}`);
  return new Date(`${date}T00:00:00.000Z`);
}

/** Inverse of calendarDateToUtc. */
export function utcToCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Format a `@db.Date` value (UTC midnight) without shifting it across timezones. */
export function formatCalendarDate(date: Date | string): string {
  const iso = typeof date === "string" ? date.slice(0, 10) : utcToCalendarDate(date);
  return format(new Date(`${iso}T12:00:00`), "d MMM yyyy");
}

/** The last millisecond of `now`'s calendar day in the business timezone. */
export function businessDayEnd(now: Date = new Date()): Date {
  const t = toBusinessTime(now);
  return new Date(new TZDate(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999, BUSINESS_TZ).getTime());
}

/** The first millisecond of `now`'s calendar day in the business timezone. */
export function businessDayStart(now: Date = new Date()): Date {
  const t = toBusinessTime(now);
  return new Date(new TZDate(t.getFullYear(), t.getMonth(), t.getDate(), 0, 0, 0, 0, BUSINESS_TZ).getTime());
}

/** Parse a `<input type="datetime-local">` value ("YYYY-MM-DDTHH:mm") as business-timezone time. */
export function businessLocalToUtc(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) throw new RangeError(`Invalid local date-time: ${value}`);
  const [, y, mo, d, h, mi] = m.map(Number) as [number, number, number, number, number, number];
  return new Date(new TZDate(y, mo - 1, d, h, mi, 0, 0, BUSINESS_TZ).getTime());
}

/** Inverse of businessLocalToUtc, for pre-filling datetime-local inputs. */
export function utcToBusinessLocal(date: Date): string {
  return format(toBusinessTime(date), "yyyy-MM-dd'T'HH:mm");
}
