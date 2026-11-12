import type { OnInit} from '@angular/core';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton, IonContent, IonDatetime, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonModal,
  IonRefresher, IonRefresherContent, IonSearchbar, IonSelect, IonSelectOption, IonSkeletonText, IonToggle,
} from '@ionic/angular';
import type { InfiniteScrollCustomEvent, RefresherCustomEvent } from '@ionic/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { firstName } from '../../core/format';
import type { Paginated, Plan, PlanType } from '../../core/models';
import { NotificationsService } from '../../core/notifications.service';
import { ReferenceService } from '../../core/reference.service';
import { UiService } from '../../core/ui.service';
import { AccountBannerComponent } from '../../shared/account-banner.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { PlanCardComponent } from '../../shared/plan-card.component';

@Component({
  selector: 'yk-explore',
  imports: [
    FormsModule, IonContent, IonSearchbar, IonIcon, IonRefresher, IonRefresherContent, IonInfiniteScroll,
    IonInfiniteScrollContent, IonModal, IonButton, IonSelect, IonSelectOption, IonToggle, IonDatetime, IonSkeletonText,
    PlanCardComponent, AccountBannerComponent, EmptyStateComponent,
  ],
  template: `
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>

      <header class="yk-hero">
        <div class="yk-hero-top">
          <div class="yk-logo">yenko<span class="bang">!</span></div>
          <button class="yk-icon-btn" aria-label="Notifications" (click)="router.navigateByUrl('/tabs/notifications')">
            <ion-icon name="notifications-outline" aria-hidden="true"></ion-icon>
            @if (notifications.unread() > 0) { <span class="dot">{{ notifications.unread() > 9 ? '9+' : notifications.unread() }}</span> }
          </button>
        </div>
        <div>
          <div class="yk-hero-greeting">Akwaaba, {{ name() }}</div>
          <h1 class="yk-hero-title">Where you dey go today?</h1>
        </div>
        <ion-searchbar placeholder="Madina, airport, UGBS 201…" [debounce]="400" [(ngModel)]="q" (ionInput)="reload()"
          aria-label="Search plans" showClearButton="focus"></ion-searchbar>
      </header>
      <div class="yk-kente" aria-hidden="true"></div>

      <yk-account-banner />

      <div class="yk-chips" role="toolbar" aria-label="Plan type">
        @for (t of types; track t.value) {
          <button class="yk-chip" [class.active]="type() === t.value" (click)="setType(t.value)" [attr.aria-pressed]="type() === t.value">{{ t.label }}</button>
        }
        <button class="yk-chip" [class.active]="filterCount() > 0" (click)="filtersOpen.set(true)">
          <ion-icon name="options-outline" aria-hidden="true"></ion-icon>Filters{{ filterCount() ? ' · ' + filterCount() : '' }}
        </button>
      </div>

      <div class="yk-section-title"><h2>Happening soon</h2></div>

      <div class="yk-list">
        @if (loading()) {
          @for (i of [1, 2, 3]; track i) {
            <div class="yk-card"><ion-skeleton-text [animated]="true" style="height: 120px; border-radius: 14px"></ion-skeleton-text></div>
          }
        } @else {
          @for (p of plans(); track p.id) {
            <yk-plan-card [plan]="p" />
          } @empty {
            @if (failed()) {
              <yk-empty-state icon="cloud-offline-outline" title="Network dey play."
                text="We couldn't load the plans. Check your connection and try again." actionText="Try again" (action)="reload()" />
            } @else {
            <yk-empty-state icon="sparkles-outline" title="Chale, no plans yet."
              [text]="filterCount() || q || type() ? 'Nothing matches. Try other filters.' : 'Be the first — create a plan and others will join. Yenko!'"
              actionText="Create a plan" (action)="router.navigateByUrl('/tabs/create')" />
            }
          }
        }
      </div>

      <ion-infinite-scroll [disabled]="page() >= lastPage()" (ionInfinite)="more($event)">
        <ion-infinite-scroll-content></ion-infinite-scroll-content>
      </ion-infinite-scroll>

      <ion-modal class="yk-sheet" [isOpen]="filtersOpen()" (didDismiss)="filtersOpen.set(false)" [initialBreakpoint]="isWide ? undefined : 0.75" [breakpoints]="isWide ? undefined : [0, 0.75, 1]">
        <ng-template>
          <ion-content>
            <div class="yk-page">
              <h2 style="margin: 4px 0 16px">Filters</h2>
              <div class="yk-field">
                <ion-select class="yk-input" fill="outline" label="Destination" labelPlacement="floating" interface="action-sheet"
                  [(ngModel)]="destinationId">
                  <ion-select-option [value]="null">Anywhere</ion-select-option>
                  @for (d of ref.destinations(); track d.id) { <ion-select-option [value]="d.id">{{ d.name }}</ion-select-option> }
                </ion-select>
              </div>
              <span class="yk-label">Day</span>
              <ion-datetime locale="en-GB" presentation="date" [min]="today" [(ngModel)]="date" style="margin-bottom: 12px; border-radius: 16px"></ion-datetime>
              <ion-toggle [(ngModel)]="womenOnly" style="margin: 8px 4px 20px; width: calc(100% - 8px)">Women-only plans</ion-toggle>
              <div class="yk-actions">
                <ion-button expand="block" (click)="applyFilters()">Show plans</ion-button>
                <ion-button expand="block" fill="clear" color="medium" (click)="clearFilters()">Clear filters</ion-button>
              </div>
            </div>
          </ion-content>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
})
export class ExplorePage implements OnInit {
  readonly router = inject(Router);
  readonly notifications = inject(NotificationsService);
  readonly ref = inject(ReferenceService);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private ui = inject(UiService);

  readonly types: { value: PlanType | null; label: string }[] = [
    { value: null, label: 'All' },
    { value: 'ride', label: 'Rides' },
    { value: 'study', label: 'Study' },
    { value: 'activity', label: 'Activities' },
  ];
  readonly today = new Date().toISOString().slice(0, 10);
  /** Tablets and desktop show filters as a centred dialog instead of a bottom sheet. */
  readonly isWide = window.matchMedia('(min-width: 768px)').matches;

  q = '';
  destinationId: number | null = null;
  date: string | null = null;
  womenOnly = false;

  readonly type = signal<PlanType | null>(null);
  readonly plans = signal<Plan[]>([]);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly page = signal(1);
  readonly lastPage = signal(1);
  readonly filtersOpen = signal(false);
  readonly appliedFilters = signal(0);
  readonly filterCount = computed(() => this.appliedFilters());
  readonly name = computed(() => firstName(this.auth.user()?.name));

  async ngOnInit(): Promise<void> {
    void this.ref.load().catch(() => undefined);
    await this.reload();
  }

  ionViewWillEnter(): void {
    if (!this.loading()) void this.reload(false);
  }

  setType(t: PlanType | null): void {
    this.type.set(t);
    void this.reload();
  }

  applyFilters(): void {
    this.appliedFilters.set([this.destinationId, this.date, this.womenOnly || null].filter((v) => v !== null).length);
    this.filtersOpen.set(false);
    void this.reload();
  }

  clearFilters(): void {
    this.destinationId = null;
    this.date = null;
    this.womenOnly = false;
    this.applyFilters();
  }

  async reload(showSkeleton = true): Promise<void> {
    if (showSkeleton) this.loading.set(true);
    try {
      const res = await this.fetch(1);
      this.plans.set(res.data);
      this.page.set(1);
      this.lastPage.set(res.meta.last_page);
      this.failed.set(false);
    } catch (e) {
      // Changing a filter offline: don't leave the previous filter's plans on screen.
      if (showSkeleton) this.plans.set([]);
      this.failed.set(this.plans().length === 0);
      await this.ui.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(event: RefresherCustomEvent): Promise<void> {
    await Promise.all([this.reload(false), this.notifications.refresh(), this.auth.refresh().catch(() => undefined)]);
    await event.target.complete();
  }

  async more(event: InfiniteScrollCustomEvent): Promise<void> {
    try {
      const res = await this.fetch(this.page() + 1);
      this.plans.update((list) => [...list, ...res.data]);
      this.page.set(res.meta.current_page);
      this.lastPage.set(res.meta.last_page);
    } catch (e) {
      await this.ui.error(e);
    }
    await event.target.complete();
  }

  private fetch(page: number): Promise<Paginated<Plan>> {
    return this.api.get<Paginated<Plan>>('plans', {
      page,
      type: this.type(),
      q: this.q.trim(),
      destination_id: this.destinationId,
      date: this.date ? this.date.slice(0, 10) : null,
      women_only: this.womenOnly || null,
    });
  }
}
