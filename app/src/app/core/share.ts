import { Share } from '@capacitor/share';

import { environment } from '../../environments/environment';

import { CATEGORIES, PLAN_TYPES, formatWhen } from './format';
import type { Plan } from './models';
import { isNative, openExternal } from './native';

/** Public link to a plan (opens the web app; after login the user lands on the plan). */
export function planUrl(plan: Plan): string {
  const base = isNative() ? environment.publicUrl : window.location.origin;
  return `${base}/plans/${plan.id}`;
}

export function planShareText(plan: Plan): string {
  const what =
    plan.type === 'ride' && plan.destination
      ? `${plan.meeting_point} → ${plan.destination.name}`
      : plan.type === 'activity' && plan.category
        ? `${CATEGORIES[plan.category]} · ${plan.meeting_point}`
        : `${plan.course ? plan.course + ' · ' : ''}${plan.meeting_point}`;
  const seats = plan.seats_left > 0 ? `${plan.seats_left} ${plan.type === 'ride' ? 'seat' : 'spot'}${plan.seats_left > 1 ? 's' : ''} left` : 'Full';
  return `${PLAN_TYPES[plan.type].label}: ${plan.title}\n${what}\n${formatWhen(plan.starts_at)} · ${seats}${plan.women_only ? ' · Women only' : ''}\nJoin me on Yenko:`;
}

/** System share sheet when available, otherwise WhatsApp. Returns false if the user cancelled. */
export async function sharePlan(plan: Plan): Promise<boolean> {
  const url = planUrl(plan);
  const text = planShareText(plan);
  try {
    if (isNative() || (await Share.canShare()).value) {
      await Share.share({ title: plan.title, text, url, dialogTitle: 'Share this plan' });
      return true;
    }
  } catch (e) {
    if (String((e as Error)?.message ?? e).toLowerCase().includes('cancel')) return false;
  }
  await openExternal(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`);
  return true;
}
