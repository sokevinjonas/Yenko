import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonRefresher,
  IonRefresherContent, IonTitle, IonToolbar,
} from '@ionic/angular';
import type { InfiniteScrollCustomEvent, RefresherCustomEvent } from '@ionic/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { timeAgo } from '../../core/format';
import type { AppNotification, Paginated } from '../../core/models';
import { NotificationsService } from '../../core/notifications.service';
import { UiService } from '../../core/ui.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';

const ICONS: Record<string, string> = {
  request_received: 'hand-left-outline',
  request_accepted: 'checkmark-circle-outline',
  request_rejected: 'close-circle-outline',
  member_removed: 'remove-circle-outline',
  member_left: 'exit-outline',
  plan_cancelled: 'calendar-clear-outline',
  plan_reminder: 'alarm-outline',
  card_approved: 'shield-checkmark-outline',
  card_rejected: 'alert-circle-outline',
  account_suspended: 'ban-outline',
};

@Component({
  selector: 'yk-notifications',
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon, IonRefresher, IonRefresherContent,
    IonInfiniteScroll, IonInfiniteScrollContent, EmptyStateComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Alerts</ion-title>
        @if (notifications.unread() > 0) {
          <ion-buttons slot="end"><ion-button (click)="readAll()">Mark all read</ion-button></ion-buttons>
        }
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
      <div class="yk-kente" aria-hidden="true"></div>
      @for (n of items(); track n.id) {
        <button class="yk-notif" [class.unread]="!n.read_at" (click)="openItem(n)">
          <span class="yk-notif-icon"><ion-icon [name]="icon(n.type)" aria-hidden="true"></ion-icon></span>
          <span style="flex: 1; min-width: 0">
            <div class="yk-notif-title">{{ n.title }}</div>
            <div class="yk-notif-body">{{ n.body }}</div>
            <div class="yk-notif-time">{{ ago(n.created_at) }}</div>
          </span>
        </button>
      } @empty {
        @if (loaded()) {
          <yk-empty-state icon="notifications-outline" title="All quiet here" text="Requests, acceptances and reminders will show up here." />
        }
      }
      <ion-infinite-scroll [disabled]="page() >= lastPage()" (ionInfinite)="more($event)">
        <ion-infinite-scroll-content></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
  `,
})
export class NotificationsPage {
  readonly notifications = inject(NotificationsService);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private ui = inject(UiService);
  private router = inject(Router);

  readonly items = signal<AppNotification[]>([]);
  readonly loaded = signal(false);
  readonly page = signal(1);
  readonly lastPage = signal(1);
  readonly ago = timeAgo;

  ionViewWillEnter(): void {
    void this.load();
  }

  icon(type: string | null): string {
    return ICONS[type ?? ''] ?? 'notifications-outline';
  }

  async load(): Promise<void> {
    try {
      const res = await this.api.get<Paginated<AppNotification>>('notifications', { page: 1 });
      this.items.set(res.data);
      this.page.set(1);
      this.lastPage.set(res.meta.last_page);
      await this.notifications.refresh();
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

  async more(event: InfiniteScrollCustomEvent): Promise<void> {
    try {
      const res = await this.api.get<Paginated<AppNotification>>('notifications', { page: this.page() + 1 });
      this.items.update((l) => [...l, ...res.data]);
      this.page.set(res.meta.current_page);
      this.lastPage.set(res.meta.last_page);
    } catch (e) {
      await this.ui.error(e);
    }
    await event.target.complete();
  }

  async openItem(n: AppNotification): Promise<void> {
    if (!n.read_at) {
      this.items.update((l) => l.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      this.notifications.unread.update((c) => Math.max(0, c - 1));
      void this.api.post(`notifications/${n.id}/read`).catch(() => undefined);
    }
    if (['card_approved', 'card_rejected', 'account_suspended'].includes(n.type ?? '')) {
      await this.auth.refresh().catch(() => undefined);
      await this.router.navigateByUrl(n.type === 'card_rejected' ? '/card-verification' : '/tabs/profile');
    } else if (n.plan_id) {
      await this.router.navigateByUrl(`/plans/${n.plan_id}`);
    }
  }

  async readAll(): Promise<void> {
    try {
      await this.api.post('notifications/read-all');
      this.items.update((l) => l.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
      this.notifications.unread.set(0);
    } catch (e) {
      await this.ui.error(e);
    }
  }
}
