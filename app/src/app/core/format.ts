import type { ActivityCategory, PlanType, ReportReason } from './models';

const TZ = 'Africa/Accra';

export const PLAN_TYPES: Record<PlanType, { label: string; plural: string; icon: string }> = {
  ride: { label: 'Ride', plural: 'Rides', icon: 'car-outline' },
  study: { label: 'Study', plural: 'Study', icon: 'book-outline' },
  activity: { label: 'Activity', plural: 'Activities', icon: 'football-outline' },
};

export const CATEGORIES: Record<ActivityCategory, string> = {
  football: 'Football',
  basketball: 'Basketball',
  outing: 'Outing',
  party: 'Party',
  gym: 'Gym',
  other: 'Other',
};

export const REPORT_REASONS: Record<ReportReason, string> = {
  wrong_number: 'Wrong WhatsApp number',
  harassment: 'Harassment or rude behaviour',
  no_show: "Didn't show up",
  scam: 'Scam or money issue',
  other: 'Something else',
};

/** "Fri 13 Dec · 06:30" in Accra time. */
export function formatWhen(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ }).format(d);
  return `${day} · ${time}`;
}

/** "Today", "Tomorrow" or the date, for headers. */
export function relativeDay(iso: string): string {
  const key = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86_400_000);
  const target = new Date(iso);
  if (key(target) === key(today)) return 'Today';
  if (key(target) === key(tomorrow)) return 'Tomorrow';
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short', timeZone: TZ }).format(target);
}

/** "5 min ago", "3 h ago", "2 d ago". */
export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86_400)} d ago`;
}

export function cedis(amount: number | null): string {
  if (amount === null) return '';
  return `₵${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

export function firstName(name: string | undefined | null): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** wa.me link with a pre-filled message. */
export function whatsappLink(e164: string, text?: string): string {
  const digits = e164.replace(/\D/g, '');
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/** Ghana number for display: +233 24 123 4567. */
export function prettyPhone(e164: string | null): string {
  if (!e164) return '';
  const m = e164.match(/^\+233(\d{2})(\d{3})(\d{4})$/);
  return m ? `+233 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener');
}

/** Local "YYYY-MM-DDTHH:mm" (no timezone) for ion-datetime, in Accra time. */
export function toLocalInput(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour') === '24' ? '00' : get('hour')}:${get('minute')}`;
}
