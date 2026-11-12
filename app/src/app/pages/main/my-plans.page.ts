import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonInfiniteScroll, IonInfiniteScrollContent, IonRefresher, IonRefresherContent, IonSegment,
  IonSegmentButton, IonSkeletonText, IonTitle, IonToolbar,
} from '@ionic/angular';
import type { InfiniteScrollCustomEvent, RefresherCustomEvent } from '@ionic/angular';

import { ApiService } from '../../core/api.service';
import type { Paginated, Plan } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { PlanCardComponent } from '../../shared/plan-card.component';

type Scope = 'created' | 'joined' | 'past';

@Component({
  selector: 'yk-my-plans',
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton, IonRefresher, IonRefresherContent,
    IonInfiniteScroll, IonInfiniteScrollContent, IonSkeletonText, PlanCardComponent, EmptyStateComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>My Plans</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
      <div class="yk-kente" aria-hidden="true"></div>
      <ion-segment class="yk-segment" [ngModel]="scope()" (ionChange)="setScope($any($event).detail.value)">
        <ion-segment-button value="created">Created</ion-segment-button>
        <ion-segment-button value="joined">Joined</ion-segment-button>
        <ion-segment-button value="past">Past</ion-segment-button>
      </ion-segment>

      <div class="yk-list" style="padding-top: 14px">
        @if (loading()) {
          @for (i of [1, 2]; track i) {
            <div class="yk-card"><ion-skeleton-text [animated]="true" style="height: 110px; border-radius: 14px"></ion-skeleton-text></div>
          }
        } @else {
          @for (p of plans(); track p.id) {
            <yk-plan-card [plan]="p" [showStatus]="true" />
          } @empty {
            @switch (scope()) {
              @case ('created') {
                <yk-empty-state icon="add-circle-outline" title="No plans yet" text="Going somewhere? Post a plan and split the fare."
                  actionText="Create a plan" (action)="router.navigateByUrl('/tabs/create')" />
              }
              @case ('joined') {
                <yk-empty-state icon="people-outline" title="You haven't joined anything" text="Find a ride or a study group on Explore."
                  actionText="Explore plans" (action)="router.navigateByUrl('/tabs/explore')" />
              }
              @default {
                <yk-empty-state icon="time-outline" title="No past plans" text="Plans you made or joined will show up here after they happen." />
              }
            }
          }
        }
      </div>
      <ion-infinite-scroll [disabled]="page() >= lastPage()" (ionInfinite)="more($event)">
        <ion-infinite-scroll-content></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
  `,
})
export class MyPlansPage {
  readonly router = inject(Router);
  private api = inject(ApiService);
  private ui = inject(UiService);

  readonly scope = signal<Scope>('created');
  readonly plans = signal<Plan[]>([]);
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly lastPage = signal(1);

  ionViewWillEnter(): void {
    void this.load(this.plans().length === 0);
  }

  setScope(scope: Scope): void {
    this.scope.set(scope);
    void this.load(true);
  }

  async load(skeleton: boolean): Promise<void> {
    if (skeleton) this.loading.set(true);
    try {
      const res = await this.fetch(1);
      this.plans.set(res.data);
      this.page.set(1);
      this.lastPage.set(res.meta.last_page);
    } catch (e) {
      await this.ui.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(event: RefresherCustomEvent): Promise<void> {
    await this.load(false);
    await event.target.complete();
  }

  async more(event: InfiniteScrollCustomEvent): Promise<void> {
    try {
      const res = await this.fetch(this.page() + 1);
      this.plans.update((l) => [...l, ...res.data]);
      this.page.set(res.meta.current_page);
      this.lastPage.set(res.meta.last_page);
    } catch (e) {
      await this.ui.error(e);
    }
    await event.target.complete();
  }

  private fetch(page: number): Promise<Paginated<Plan>> {
    return this.api.get<Paginated<Plan>>('me/plans', { scope: this.scope(), page });
  }
}
