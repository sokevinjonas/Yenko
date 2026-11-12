import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ActionSheetController, AlertController, IonBackButton, IonBadge, IonButton, IonButtons, IonContent, IonHeader,
  IonIcon, IonRefresher, IonRefresherContent, IonSkeletonText, IonSpinner, IonTitle, IonToolbar,
} from '@ionic/angular';
import type { RefresherCustomEvent } from '@ionic/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CATEGORIES, PLAN_TYPES, cedis, formatWhen, prettyPhone, relativeDay, whatsappLink } from '../../core/format';
import type { Member, Plan } from '../../core/models';
import { openExternal, tap } from '../../core/native';
import { sharePlan } from '../../core/share';
import { UiService } from '../../core/ui.service';
import { AvatarComponent } from '../../shared/avatar.component';

import { reportUser } from './report';

@Component({
  selector: 'yk-plan-detail',
  imports: [
    RouterLink, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonButton, IonIcon, IonBadge,
    IonSpinner, IonSkeletonText, IonRefresher, IonRefresherContent, AvatarComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/explore" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ plan() ? meta().label : '' }}</ion-title>
        @if (plan()) {
          <ion-buttons slot="end">
            @if (isActive()) {
              <ion-button aria-label="Share this plan" (click)="share()"><ion-icon slot="icon-only" name="share-social-outline"></ion-icon></ion-button>
            }
            @if (!plan()!.viewer.is_creator) {
              <ion-button aria-label="Report the organiser" (click)="report(plan()!.creator)"><ion-icon slot="icon-only" name="flag-outline"></ion-icon></ion-button>
            }
          </ion-buttons>
        }
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
      <div class="yk-kente" aria-hidden="true"></div>

      @if (!plan()) {
        <div class="yk-page"><ion-skeleton-text [animated]="true" style="height: 260px; border-radius: 20px"></ion-skeleton-text></div>
      } @else {
        @let p = plan()!;
        <div class="yk-page" [class]="'type-' + p.type">
          <div class="yk-plan-head" style="margin-bottom: 14px">
            <div class="yk-type-icon"><ion-icon [name]="meta().icon" aria-hidden="true"></ion-icon></div>
            <div style="flex: 1">
              <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center">
                <span class="yk-type-label">{{ meta().label }}</span>
                @if (p.women_only) { <span class="yk-pill danger">Women only</span> }
                @if (p.status === 'cancelled') { <span class="yk-pill grey">Cancelled</span> }
                @if (p.status === 'done') { <span class="yk-pill grey">Done</span> }
                @if (p.status === 'full') { <span class="yk-pill">Full</span> }
              </div>
              <h1 style="margin: 2px 0 0; font-size: 24px">{{ p.title }}</h1>
            </div>
          </div>

          <div class="yk-box">
            <div class="yk-meta" style="font-size: 15px; gap: 10px">
              <div><ion-icon name="calendar-outline" aria-hidden="true"></ion-icon><span><strong>{{ day() }}</strong> · {{ when() }}</span></div>
              <div><ion-icon name="location-outline" aria-hidden="true"></ion-icon>Meet at {{ p.meeting_point }}</div>
              @if (p.destination) { <div><ion-icon name="navigate-outline" aria-hidden="true"></ion-icon>Going to {{ p.destination.name }}</div> }
              @if (p.course) { <div><ion-icon name="school-outline" aria-hidden="true"></ion-icon>{{ p.course }}</div> }
              @if (p.category) { <div><ion-icon name="football-outline" aria-hidden="true"></ion-icon>{{ category() }}</div> }
              @if (p.price_per_person !== null) { <div><ion-icon name="cash-outline" aria-hidden="true"></ion-icon>About {{ price() }} per person</div> }
            </div>
            <div style="margin-top: 14px">
              <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px">
                <span>{{ p.accepted_count }} / {{ p.seats_total }} {{ p.type === 'ride' ? 'seats' : 'spots' }} taken</span>
                <strong>{{ p.seats_left }} left</strong>
              </div>
              <div class="yk-seats"><div [style.width.%]="(p.accepted_count / p.seats_total) * 100"></div></div>
            </div>
            @if (p.description) { <p style="margin: 14px 0 0; white-space: pre-line">{{ p.description }}</p> }
          </div>

          <div class="yk-box">
            <div class="yk-row">
              <yk-avatar [name]="p.creator.name" [url]="p.creator.avatar_url" [size]="44" />
              <div class="yk-row-main">
                <div class="yk-row-title">{{ p.creator.name }}
                  @if (p.creator.is_verified) { <ion-icon name="checkmark-circle" style="color: var(--yk-leaf); vertical-align: -2px" aria-label="Verified student"></ion-icon> }
                </div>
                <div class="yk-row-sub">Organiser{{ p.creator.hall ? ' · ' + p.creator.hall : '' }}</div>
              </div>
            </div>
          </div>

          <!-- Organiser view -->
          @if (p.viewer.is_creator) {
            @if (isActive()) {
              <div class="yk-actions" style="margin-bottom: 14px">
                <ion-button expand="block" [routerLink]="['/plans', p.id, 'requests']">
                  Manage requests
                  @if (p.pending_requests_count) { <ion-badge color="secondary" style="margin-left: 8px">{{ p.pending_requests_count }}</ion-badge> }
                </ion-button>
                <ion-button expand="block" fill="outline" color="secondary" (click)="share()">
                  <ion-icon slot="start" name="share-social-outline" aria-hidden="true"></ion-icon>Share in your WhatsApp groups
                </ion-button>
                <ion-button expand="block" fill="outline" color="secondary" [routerLink]="['/plans', p.id, 'edit']">Edit plan</ion-button>
              </div>
            }
            @if (p.contacts; as c) {
              @if (c.whatsapp_group_link) {
                <ion-button expand="block" class="yk-whatsapp" (click)="open(c.whatsapp_group_link)">
                  <ion-icon slot="start" name="logo-whatsapp" aria-hidden="true"></ion-icon>Open the WhatsApp group
                </ion-button>
              }
              <div class="yk-box" style="margin-top: 14px">
                <h3>Members ({{ c.members.length }})</h3>
                @for (m of c.members; track m.id) {
                  <div class="yk-row">
                    <yk-avatar [name]="m.name" [url]="m.avatar_url" [size]="40" />
                    <div class="yk-row-main">
                      <div class="yk-row-title">{{ m.name }}</div>
                      <div class="yk-row-sub">{{ prettyPhone(m.whatsapp) }}{{ m.hall ? ' · ' + m.hall : '' }}</div>
                    </div>
                    @if (m.whatsapp) {
                      <ion-button size="small" class="yk-whatsapp" [attr.aria-label]="'WhatsApp ' + m.name" (click)="chat(m.whatsapp)">
                        <ion-icon slot="icon-only" name="logo-whatsapp"></ion-icon>
                      </ion-button>
                    }
                    <ion-button size="small" fill="clear" color="medium" [attr.aria-label]="'Report ' + m.name" (click)="report(m)">
                      <ion-icon slot="icon-only" name="flag-outline"></ion-icon>
                    </ion-button>
                  </div>
                } @empty {
                  <p class="yk-muted" style="margin: 0">Nobody yet. Share the plan with your friends!</p>
                }
              </div>
            }
            @if (isActive()) {
              <ion-button expand="block" fill="clear" color="danger" (click)="cancelPlan()">Cancel this plan</ion-button>
            }
          } @else {
            <!-- Visitor / member view -->
            @switch (p.viewer.request_status) {
              @case ('accepted') {
                <div class="yk-success-box">
                  <h3>You're in! 🎉</h3>
                  <p style="margin: 0">Time to link up. Say hi to {{ p.creator.name.split(' ')[0] }} on WhatsApp.</p>
                </div>
                @if (p.contacts; as c) {
                  <div class="yk-actions">
                    @if (c.creator_whatsapp) {
                      <ion-button expand="block" class="yk-whatsapp" (click)="chat(c.creator_whatsapp)">
                        <ion-icon slot="start" name="logo-whatsapp" aria-hidden="true"></ion-icon>Chat with {{ p.creator.name.split(' ')[0] }}
                      </ion-button>
                    }
                    @if (c.whatsapp_group_link) {
                      <ion-button expand="block" fill="outline" color="secondary" (click)="open(c.whatsapp_group_link)">
                        <ion-icon slot="start" name="people-outline" aria-hidden="true"></ion-icon>Join the WhatsApp group
                      </ion-button>
                    }
                  </div>
                  @if (c.members.length > 1) {
                    <div class="yk-box" style="margin-top: 14px">
                      <h3>Who's coming</h3>
                      @for (m of c.members; track m.id) {
                        <div class="yk-row">
                          <yk-avatar [name]="m.name" [url]="m.avatar_url" [size]="36" />
                          <div class="yk-row-main"><div class="yk-row-title">{{ m.name }}</div><div class="yk-row-sub">{{ m.hall }}</div></div>
                        </div>
                      }
                    </div>
                  }
                }
                @if (isActive()) {
                  <ion-button expand="block" fill="clear" color="danger" (click)="leave(true)">Leave this plan</ion-button>
                }
              }
              @case ('pending') {
                <div class="yk-banner" style="margin: 0 0 12px">
                  <ion-icon name="hourglass-outline" aria-hidden="true"></ion-icon>
                  <div class="yk-banner-text"><strong>Request sent</strong>Waiting for {{ p.creator.name.split(' ')[0] }} to accept you.</div>
                </div>
                <ion-button expand="block" fill="clear" color="medium" (click)="leave(false)">Cancel my request</ion-button>
              }
              @default {
                @if (p.viewer.can_join) {
                  <ion-button expand="block" (click)="join()" [disabled]="busy()">
                    @if (busy()) { <ion-spinner name="crescent"></ion-spinner> } @else { {{ p.auto_accept ? 'Join now' : 'Ask to join' }} }
                  </ion-button>
                  <p class="yk-help yk-center">
                    {{ p.auto_accept ? "You'll get the organiser's WhatsApp right away." : "You'll get the organiser's WhatsApp once they accept you." }}
                  </p>
                } @else if (p.viewer.join_blocker_message) {
                  <div class="yk-banner" [class.danger]="p.viewer.join_blocker === 'suspended' || p.viewer.join_blocker === 'women_only'" style="margin: 0 0 12px">
                    <ion-icon name="information-circle-outline" aria-hidden="true"></ion-icon>
                    <div class="yk-banner-text">{{ p.viewer.join_blocker_message }}</div>
                    @if (fixLink(); as link) { <a class="yk-link" [routerLink]="link">Fix it</a> }
                  </div>
                }
              }
            }
          }
        </div>
      }
    </ion-content>
  `,
})
export class PlanDetailPage {
  readonly id = input.required<string>();
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private ui = inject(UiService);
  private router = inject(Router);
  private sheets = inject(ActionSheetController);
  private alerts = inject(AlertController);

  readonly plan = signal<Plan | null>(null);
  readonly busy = signal(false);
  readonly prettyPhone = prettyPhone;

  readonly meta = computed(() => PLAN_TYPES[this.plan()?.type ?? 'ride']);
  readonly when = computed(() => (this.plan() ? formatWhen(this.plan()!.starts_at).split(' · ')[1] : ''));
  readonly day = computed(() => (this.plan() ? relativeDay(this.plan()!.starts_at) : ''));
  readonly price = computed(() => cedis(this.plan()?.price_per_person ?? null));
  readonly category = computed(() => (this.plan()?.category ? CATEGORIES[this.plan()!.category!] : ''));
  readonly isActive = computed(() => ['open', 'full'].includes(this.plan()?.status ?? ''));
  readonly fixLink = computed(() => {
    const b = this.plan()?.viewer.join_blocker;
    if (b === 'not_verified') return this.auth.user()?.card_verification?.status === 'pending' ? null : '/verify';
    if (b === 'profile_incomplete') return '/complete-profile';
    return null;
  });

  ionViewWillEnter(): void {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.plan.set(await this.api.get<Plan>(`plans/${this.id()}`));
    } catch (e) {
      await this.ui.error(e);
      if ((e as { status?: number }).status === 404) await this.router.navigateByUrl('/tabs/explore', { replaceUrl: true });
    }
  }

  async refresh(event: RefresherCustomEvent): Promise<void> {
    await this.load();
    await event.target.complete();
  }

  async join(): Promise<void> {
    const p = this.plan()!;
    let message: string | null = null;
    if (!p.auto_accept) {
      const alert = await this.alerts.create({
        header: 'Say hi 👋',
        message: `Add a short note for ${p.creator.name.split(' ')[0]} (optional).`,
        inputs: [{ name: 'message', type: 'textarea', placeholder: 'e.g. I have a small bag only', attributes: { maxlength: 200 } }],
        buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Send request', role: 'confirm' }],
      });
      await alert.present();
      const res = await alert.onDidDismiss<{ values: { message: string } }>();
      if (res.role !== 'confirm') return;
      message = res.data?.values.message?.trim() || null;
    }
    this.busy.set(true);
    try {
      const updated = await this.api.post<Plan>(`plans/${p.id}/join`, { message });
      this.plan.set(updated);
      tap();
      await this.ui.toast(updated.viewer.request_status === 'accepted' ? "You're in! Time to link up." : 'Request sent!', 'success');
    } catch (e) {
      await this.ui.error(e);
      await this.load();
    } finally {
      this.busy.set(false);
    }
  }

  async leave(isMember: boolean): Promise<void> {
    const ok = await this.ui.confirm(isMember ? 'Leave this plan?' : 'Cancel your request?',
      isMember ? 'The organiser will be told that you left.' : '', isMember ? 'Leave' : 'Cancel request', true);
    if (!ok) return;
    try {
      this.plan.set(await this.api.post<Plan>(`plans/${this.plan()!.id}/leave`));
    } catch (e) {
      await this.ui.error(e);
    }
  }

  async cancelPlan(): Promise<void> {
    const ok = await this.ui.confirm('Cancel this plan?', 'Everyone who joined or asked to join will be notified.', 'Cancel plan', true);
    if (!ok) return;
    try {
      this.plan.set(await this.api.post<Plan>(`plans/${this.plan()!.id}/cancel`));
      await this.ui.toast('Plan cancelled.');
    } catch (e) {
      await this.ui.error(e);
    }
  }

  chat(phone: string): void {
    const p = this.plan()!;
    const me = this.auth.user()?.name ?? '';
    void openExternal(whatsappLink(phone, `Hi, I'm ${me} from Yenko about "${p.title}".`));
  }

  open(url: string): void {
    void openExternal(url);
  }

  async share(): Promise<void> {
    await sharePlan(this.plan()!);
  }

  report(user: Pick<Member, 'id' | 'name'>): void {
    void reportUser({ sheets: this.sheets, alerts: this.alerts, api: this.api, ui: this.ui }, user, this.plan()?.id);
  }
}
