import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';

import { CATEGORIES, PLAN_TYPES, cedis, formatWhen } from '../core/format';
import type { Plan } from '../core/models';

import { AvatarComponent } from './avatar.component';

@Component({
  selector: 'yk-plan-card',
  imports: [RouterLink, IonIcon, AvatarComponent],
  template: `
    @let p = plan();
    <a class="yk-card" [class]="'type-' + p.type" [routerLink]="['/plans', p.id]">
      <div class="yk-plan-head">
        <div class="yk-type-icon"><ion-icon [name]="meta().icon" aria-hidden="true"></ion-icon></div>
        <div style="flex: 1; min-width: 0">
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap">
            <span class="yk-type-label">{{ meta().label }}</span>
            @if (p.women_only) {
              <span class="yk-pill danger">Women only</span>
            }
            @if (p.is_boosted) {
              <span class="yk-pill">Featured</span>
            }
            @if (status(); as s) {
              <span class="yk-pill" [class]="s.cls">{{ s.label }}</span>
            }
          </div>
          <div class="yk-plan-title">{{ p.title }}</div>
        </div>
      </div>
      <div class="yk-meta">
        <div><ion-icon name="time-outline" aria-hidden="true"></ion-icon>{{ when() }}</div>
        <div><ion-icon name="location-outline" aria-hidden="true"></ion-icon>{{ place() }}</div>
      </div>
      <div class="yk-card-foot">
        <div class="yk-person">
          <yk-avatar [name]="p.creator.name" [url]="p.creator.avatar_url" [size]="32" />
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ p.creator.name }}</span>
          @if (p.creator.is_verified) {
            <ion-icon class="verified" name="checkmark-circle" aria-label="Verified student"></ion-icon>
          }
        </div>
        <div class="yk-price">
          @if (p.price_per_person !== null) {
            {{ price() }}<span class="per"> / person</span>
          }
          <small>{{ seatsText() }}</small>
        </div>
      </div>
    </a>
  `,
})
export class PlanCardComponent {
  readonly plan = input.required<Plan>();
  /** Show my request/plan status (My Plans screen). */
  readonly showStatus = input(false);

  readonly meta = computed(() => PLAN_TYPES[this.plan().type]);
  readonly when = computed(() => formatWhen(this.plan().starts_at));
  readonly price = computed(() => cedis(this.plan().price_per_person));
  readonly place = computed(() => {
    const p = this.plan();
    if (p.type === 'ride' && p.destination) return `${p.meeting_point} → ${p.destination.name}`;
    if (p.type === 'study' && p.course) return `${p.course} · ${p.meeting_point}`;
    if (p.type === 'activity' && p.category) return `${CATEGORIES[p.category]} · ${p.meeting_point}`;
    return p.meeting_point;
  });
  readonly seatsText = computed(() => {
    const p = this.plan();
    if (p.status === 'full' || p.seats_left === 0) return 'Full';
    const noun = p.type === 'ride' ? 'seat' : 'spot';
    return `${p.seats_left} ${noun}${p.seats_left > 1 ? 's' : ''} left`;
  });
  readonly status = computed(() => {
    if (!this.showStatus()) return null;
    const p = this.plan();
    if (p.status === 'cancelled') return { label: 'Cancelled', cls: 'grey' };
    if (p.status === 'done') return { label: 'Done', cls: 'grey' };
    if (p.viewer.is_creator) {
      const n = p.pending_requests_count ?? 0;
      return n > 0 ? { label: `${n} request${n > 1 ? 's' : ''}`, cls: 'blue' } : null;
    }
    if (p.viewer.request_status === 'pending') return { label: 'Pending', cls: '' };
    if (p.viewer.request_status === 'accepted') return { label: "You're in", cls: 'green' };
    return null;
  });
}
