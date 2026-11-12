import { Component, computed, inject, input, signal } from '@angular/core';
import {
  ActionSheetController, AlertController, IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon,
  IonRefresher, IonRefresherContent, IonTitle, IonToolbar,
} from '@ionic/angular';
import type { RefresherCustomEvent } from '@ionic/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { prettyPhone, timeAgo, whatsappLink } from '../../core/format';
import type { PlanRequest } from '../../core/models';
import { openExternal, tap } from '../../core/native';
import { UiService } from '../../core/ui.service';
import { AvatarComponent } from '../../shared/avatar.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';

import { reportUser } from './report';

@Component({
  selector: 'yk-manage-requests',
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonButton, IonIcon, IonRefresher, IonRefresherContent, AvatarComponent, EmptyStateComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button [defaultHref]="'/plans/' + id()" text=""></ion-back-button></ion-buttons>
        <ion-title>Requests</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
      <div class="yk-kente" aria-hidden="true"></div>
      <div class="yk-page">
        @if (loaded() && !requests().length) {
          <yk-empty-state icon="people-outline" title="No requests yet" text="When someone asks to join, they'll show up here." />
        }

        @if (pending().length) {
          <h2 style="font-size: 18px; margin: 4px 0 10px">Waiting for you ({{ pending().length }})</h2>
          @for (r of pending(); track r.id) {
            <div class="yk-box">
              <div class="yk-row" style="border: none; padding-top: 0">
                <yk-avatar [name]="r.user.name" [url]="r.user.avatar_url" [size]="44" />
                <div class="yk-row-main">
                  <div class="yk-row-title">{{ r.user.name }}
                    @if (r.user.is_verified) { <ion-icon name="checkmark-circle" style="color: var(--yk-leaf); vertical-align: -2px" aria-label="Verified student"></ion-icon> }
                  </div>
                  <div class="yk-row-sub">{{ r.user.hall }} · {{ ago(r.created_at) }}</div>
                </div>
              </div>
              @if (r.message) { <p style="margin: 0 0 12px; font-style: italic">“{{ r.message }}”</p> }
              <div style="display: flex; gap: 8px">
                <ion-button style="flex: 1" (click)="act(r, 'accept')">Accept</ion-button>
                <ion-button style="flex: 1" fill="outline" color="medium" (click)="act(r, 'reject')">Decline</ion-button>
              </div>
            </div>
          }
        }

        @if (accepted().length) {
          <h2 style="font-size: 18px; margin: 18px 0 10px">Members ({{ accepted().length }})</h2>
          <div class="yk-box">
            @for (r of accepted(); track r.id) {
              <div class="yk-row">
                <yk-avatar [name]="r.user.name" [url]="r.user.avatar_url" [size]="40" />
                <div class="yk-row-main">
                  <div class="yk-row-title">{{ r.user.name }}</div>
                  <div class="yk-row-sub">{{ phone(r.user.whatsapp) }}</div>
                </div>
                @if (r.user.whatsapp) {
                  <ion-button size="small" class="yk-whatsapp" [attr.aria-label]="'WhatsApp ' + r.user.name" (click)="chat(r.user.whatsapp)">
                    <ion-icon slot="icon-only" name="logo-whatsapp"></ion-icon>
                  </ion-button>
                }
                <ion-button size="small" fill="clear" color="medium" [attr.aria-label]="'More options for ' + r.user.name" (click)="more(r)">
                  <ion-icon slot="icon-only" name="ellipsis-vertical"></ion-icon>
                </ion-button>
              </div>
            }
          </div>
        }
      </div>
    </ion-content>
  `,
})
export class ManageRequestsPage {
  readonly id = input.required<string>();
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private ui = inject(UiService);
  private sheets = inject(ActionSheetController);
  private alerts = inject(AlertController);

  readonly requests = signal<PlanRequest[]>([]);
  readonly loaded = signal(false);
  readonly pending = computed(() => this.requests().filter((r) => r.status === 'pending'));
  readonly accepted = computed(() => this.requests().filter((r) => r.status === 'accepted'));
  readonly ago = timeAgo;
  readonly phone = prettyPhone;

  ionViewWillEnter(): void {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.requests.set(await this.api.get<PlanRequest[]>(`plans/${this.id()}/requests`));
    } catch (e) {
      await this.ui.error(e);
    } finally {
      this.loaded.set(true);
    }
  }

  async refresh(event: RefresherCustomEvent): Promise<void> {
    await this.load();
    await event.target.complete();
  }

  async act(r: PlanRequest, action: 'accept' | 'reject' | 'remove'): Promise<void> {
    try {
      const updated = await this.api.post<PlanRequest>(`requests/${r.id}/${action}`);
      if (action === 'accept') tap();
      this.requests.update((list) =>
        ['rejected', 'removed'].includes(updated.status) ? list.filter((x) => x.id !== r.id) : list.map((x) => (x.id === r.id ? updated : x)),
      );
      await this.ui.toast(action === 'accept' ? `${r.user.name.split(' ')[0]} is in!` : action === 'reject' ? 'Request declined.' : 'Member removed.',
        action === 'accept' ? 'success' : 'dark');
    } catch (e) {
      await this.ui.error(e);
      await this.load();
    }
  }

  chat(phone: string): void {
    void openExternal(whatsappLink(phone, `Hi, it's ${this.auth.user()?.name ?? ''} from Yenko about our plan.`));
  }

  async more(r: PlanRequest): Promise<void> {
    const sheet = await this.sheets.create({
      header: r.user.name,
      buttons: [
        { text: 'Remove from plan', role: 'destructive', data: 'remove' },
        { text: 'Report', data: 'report' },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
    const { data } = await sheet.onDidDismiss<string>();
    if (data === 'remove' && (await this.ui.confirm(`Remove ${r.user.name}?`, 'They will be notified.', 'Remove', true))) {
      await this.act(r, 'remove');
    } else if (data === 'report') {
      await reportUser({ sheets: this.sheets, alerts: this.alerts, api: this.api, ui: this.ui }, r.user, Number(this.id()));
    }
  }
}
