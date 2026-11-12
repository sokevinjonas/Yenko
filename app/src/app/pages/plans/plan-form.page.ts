import { ChangeDetectorRef, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonDatetime, IonDatetimeButton, IonHeader, IonIcon, IonInput,
  IonModal, IonSelect, IonSelectOption, IonSpinner, IonTextarea, IonTitle, IonToggle, IonToolbar,
} from '@ionic/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CATEGORIES, PLAN_TYPES, toLocalInput } from '../../core/format';
import type { ActivityCategory, Plan, PlanPayload, PlanType } from '../../core/models';
import { ReferenceService } from '../../core/reference.service';
import { UiService } from '../../core/ui.service';
import { AccountBannerComponent } from '../../shared/account-banner.component';

const MAX_SEATS: Record<PlanType, number> = { ride: 10, study: 50, activity: 50 };

/** Create (tab) and edit (/plans/:id/edit) a plan. */
@Component({
  selector: 'yk-plan-form',
  imports: [
    FormsModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonInput, IonTextarea, IonSelect,
    IonSelectOption, IonToggle, IonDatetime, IonDatetimeButton, IonModal, IonButton, IonSpinner, IonIcon, AccountBannerComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        @if (isEdit()) { <ion-buttons slot="start"><ion-back-button [defaultHref]="'/plans/' + id()" text=""></ion-back-button></ion-buttons> }
        <ion-title>{{ isEdit() ? 'Edit plan' : 'New plan' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="yk-kente" aria-hidden="true"></div>
      @if (!isEdit()) { <yk-account-banner /> }
      <form class="yk-page" (ngSubmit)="submit()">
        @if (!isEdit()) {
          <span class="yk-label">What's the plan?</span>
          <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 18px">
            @for (t of typeList; track t) {
              <button type="button" class="yk-card" [class]="'type-' + t" (click)="setType(t)"
                [style.outline]="form.type === t ? '3px solid var(--yk-gold)' : 'none'" [attr.aria-pressed]="form.type === t"
                style="align-items: center; padding: 14px 8px; gap: 8px; border: none; font: inherit">
                <span class="yk-type-icon"><ion-icon [name]="types[t].icon" aria-hidden="true"></ion-icon></span>
                <strong>{{ types[t].label }}</strong>
              </button>
            }
          </div>
        }

        <div class="yk-field">
          <ion-input class="yk-input" fill="outline" label="Title" labelPlacement="floating" name="title" [(ngModel)]="form.title"
            [placeholder]="placeholders[form.type!]" maxlength="80" [counter]="true"></ion-input>
          @if (errors()['title']) { <div class="yk-field-error">{{ errors()['title'] }}</div> }
        </div>

        @if (form.type === 'ride') {
          <div class="yk-field">
            <ion-select class="yk-input" fill="outline" label="Destination" labelPlacement="floating" interface="action-sheet"
              name="destination" [(ngModel)]="form.destination_id">
              @for (d of ref.destinations(); track d.id) { <ion-select-option [value]="d.id">{{ d.name }}</ion-select-option> }
            </ion-select>
            @if (errors()['destination_id']) { <div class="yk-field-error">{{ errors()['destination_id'] }}</div> }
          </div>
        }
        @if (form.type === 'study') {
          <div class="yk-field">
            <ion-input class="yk-input" fill="outline" label="Course (optional)" labelPlacement="floating" name="course"
              [(ngModel)]="form.course" placeholder="UGBS 201" maxlength="60"></ion-input>
          </div>
        }
        @if (form.type === 'activity') {
          <div class="yk-field">
            <ion-select class="yk-input" fill="outline" label="Activity" labelPlacement="floating" interface="action-sheet"
              name="category" [(ngModel)]="form.category">
              @for (c of categoryList; track c) { <ion-select-option [value]="c">{{ categories[c] }}</ion-select-option> }
            </ion-select>
            @if (errors()['category']) { <div class="yk-field-error">{{ errors()['category'] }}</div> }
          </div>
        }

        <div class="yk-field">
          <ion-input class="yk-input" fill="outline" label="Meeting point" labelPlacement="floating" name="meeting_point"
            [(ngModel)]="form.meeting_point" placeholder="Akuafo Hall gate" maxlength="120"></ion-input>
          @if (errors()['meeting_point']) { <div class="yk-field-error">{{ errors()['meeting_point'] }}</div> }
        </div>

        <div class="yk-field">
          <span class="yk-label">When?</span>
          <ion-datetime-button datetime="yk-starts-at"></ion-datetime-button>
          <ion-modal [keepContentsMounted]="true">
            <ng-template>
              <ion-datetime id="yk-starts-at" locale="en-GB" presentation="date-time" [min]="minDate" [max]="maxDate" [minuteValues]="minutes"
                name="starts_at" [(ngModel)]="form.starts_at" [showDefaultButtons]="true" hourCycle="h23"></ion-datetime>
            </ng-template>
          </ion-modal>
          @if (errors()['starts_at']) { <div class="yk-field-error">{{ errors()['starts_at'] }}</div> }
        </div>

        <div class="yk-field">
          <span class="yk-label">{{ form.type === 'ride' ? 'Free seats (not counting you)' : 'How many people can join?' }}</span>
          <div style="display: flex; align-items: center; gap: 16px">
            <ion-button fill="outline" color="secondary" aria-label="One less" (click)="seats(-1)" [disabled]="form.seats_total <= minSeats()">
              <ion-icon slot="icon-only" name="remove"></ion-icon>
            </ion-button>
            <strong style="font-size: 26px; min-width: 40px; text-align: center" aria-live="polite">{{ form.seats_total }}</strong>
            <ion-button fill="outline" color="secondary" aria-label="One more" (click)="seats(1)" [disabled]="form.seats_total >= maxSeats()">
              <ion-icon slot="icon-only" name="add"></ion-icon>
            </ion-button>
          </div>
          @if (errors()['seats_total']) { <div class="yk-field-error">{{ errors()['seats_total'] }}</div> }
        </div>

        @if (form.type === 'ride') {
          <div class="yk-field">
            <ion-input class="yk-input" fill="outline" label="Price per person in ₵ (optional)" labelPlacement="floating" type="number"
              inputmode="decimal" name="price" [(ngModel)]="form.price_per_person" min="0"></ion-input>
            <div class="yk-help">Your estimate, to split the fare. Payment is between you.</div>
          </div>
        }

        <div class="yk-field">
          <ion-textarea class="yk-input" fill="outline" label="Details (optional)" labelPlacement="floating" name="description"
            [(ngModel)]="form.description" [autoGrow]="true" maxlength="500" [counter]="true"
            placeholder="Luggage, where exactly to meet, what to bring…"></ion-textarea>
        </div>

        <div class="yk-field">
          <ion-input class="yk-input" fill="outline" label="WhatsApp group link (optional)" labelPlacement="floating" type="url"
            name="link" [(ngModel)]="form.whatsapp_group_link" placeholder="https://chat.whatsapp.com/…"></ion-input>
          @if (errors()['whatsapp_group_link']) {
            <div class="yk-field-error">{{ errors()['whatsapp_group_link'] }}</div>
          } @else {
            <div class="yk-help">Only people you accept will see it.</div>
          }
        </div>

        <div class="yk-box">
          <ion-toggle name="auto" [(ngModel)]="form.auto_accept" style="width: 100%">
            Accept people automatically<br /><span class="yk-muted" style="font-size: 13px">First come, first served while seats are left</span>
          </ion-toggle>
          @if (isFemale()) {
            <ion-toggle name="women" [(ngModel)]="form.women_only" style="width: 100%; margin-top: 14px">
              Women only<br /><span class="yk-muted" style="font-size: 13px">Only women can join</span>
            </ion-toggle>
          }
          @if (errors()['women_only']) { <div class="yk-field-error">{{ errors()['women_only'] }}</div> }
        </div>

        <ion-button expand="block" type="submit" [disabled]="busy() || !canSubmit()">
          @if (busy()) { <ion-spinner name="crescent"></ion-spinner> } @else { {{ isEdit() ? 'Save changes' : 'Post my plan — Yenko!' }} }
        </ion-button>
      </form>
    </ion-content>
  `,
})
export class PlanFormPage {
  /** Present on /plans/:id/edit, absent on the Create tab. */
  readonly id = input<string>();
  readonly ref = inject(ReferenceService);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private ui = inject(UiService);
  private router = inject(Router);
  /** The app is zoneless: tell Angular when the plain form object changes after an await. */
  private cdr = inject(ChangeDetectorRef);

  readonly types = PLAN_TYPES;
  readonly typeList: PlanType[] = ['ride', 'study', 'activity'];
  readonly categories = CATEGORIES;
  readonly categoryList = Object.keys(CATEGORIES) as ActivityCategory[];
  readonly placeholders: Record<PlanType, string> = {
    ride: 'Legon → Kotoka Airport', study: 'Exam prep — past questions', activity: '5-a-side football',
  };
  readonly minutes = '0,15,30,45';
  minDate = toLocalInput(new Date());
  maxDate = toLocalInput(new Date(Date.now() + 30 * 86_400_000));

  form: PlanPayload = this.blank();
  readonly busy = signal(false);
  readonly errors = signal<Record<string, string>>({});
  readonly acceptedCount = signal(0);
  readonly isEdit = computed(() => !!this.id());
  readonly isFemale = computed(() => this.auth.user()?.gender === 'female');
  readonly canSubmit = computed(() => this.isEdit() || !!this.auth.user()?.can_participate);
  readonly minSeats = (): number => Math.max(1, this.acceptedCount());
  readonly maxSeats = (): number => MAX_SEATS[this.form.type ?? 'ride'];

  async ionViewWillEnter(): Promise<void> {
    void this.ref.load().catch((e) => this.ui.error(e));
    this.minDate = toLocalInput(new Date());
    this.errors.set({});
    if (this.isEdit()) {
      await this.loadPlan();
    } else if (!this.busy()) {
      this.form = this.blank();
      void this.auth.refresh().catch(() => undefined);
    }
  }

  setType(t: PlanType): void {
    this.form.type = t;
    this.form.seats_total = Math.min(this.form.seats_total, MAX_SEATS[t]);
    if (t === 'study' && this.form.seats_total < 4) this.form.seats_total = 6;
  }

  seats(delta: number): void {
    this.form.seats_total = Math.min(this.maxSeats(), Math.max(this.minSeats(), this.form.seats_total + delta));
  }

  async submit(): Promise<void> {
    const f = this.form;
    const local: Record<string, string> = {};
    if ((f.title ?? '').trim().length < 3) local['title'] = 'Give your plan a short title.';
    if (!f.meeting_point?.trim()) local['meeting_point'] = 'Where do you meet?';
    if (f.type === 'ride' && !f.destination_id) local['destination_id'] = 'Pick a destination.';
    if (f.type === 'activity' && !f.category) local['category'] = 'Pick an activity.';
    if (f.whatsapp_group_link && !f.whatsapp_group_link.startsWith('https://chat.whatsapp.com/')) {
      local['whatsapp_group_link'] = 'Paste a WhatsApp group invite link (https://chat.whatsapp.com/…).';
    }
    this.errors.set(local);
    if (Object.keys(local).length) return;

    const body: Partial<PlanPayload> = {
      ...f,
      title: f.title.trim(),
      meeting_point: f.meeting_point.trim(),
      description: f.description?.trim() || null,
      course: f.course?.trim() || null,
      whatsapp_group_link: f.whatsapp_group_link?.trim() || null,
      price_per_person: f.price_per_person === null || (f.price_per_person as unknown) === '' ? null : Number(f.price_per_person),
    };
    if (this.isEdit()) delete body.type;

    this.busy.set(true);
    try {
      const plan = this.isEdit()
        ? await this.api.put<Plan>(`plans/${this.id()}`, body)
        : await this.api.post<Plan>('plans', body);
      await this.ui.toast(this.isEdit() ? 'Plan updated.' : 'Your plan is live! 🎉', 'success');
      this.form = this.blank();
      this.cdr.markForCheck();
      await this.router.navigateByUrl(`/plans/${plan.id}`, { replaceUrl: this.isEdit() });
    } catch (e) {
      this.errors.set(this.ui.fieldErrors(e));
      if (!Object.keys(this.errors()).length) await this.ui.error(e);
    } finally {
      this.busy.set(false);
    }
  }

  private async loadPlan(): Promise<void> {
    try {
      const p = await this.api.get<Plan>(`plans/${this.id()}`);
      this.acceptedCount.set(p.accepted_count);
      this.form = {
        type: p.type, title: p.title, description: p.description, meeting_point: p.meeting_point,
        starts_at: toLocalInput(new Date(p.starts_at)), seats_total: p.seats_total, women_only: p.women_only,
        auto_accept: p.auto_accept, whatsapp_group_link: p.contacts?.whatsapp_group_link ?? null,
        destination_id: p.destination?.id ?? null, price_per_person: p.price_per_person, course: p.course, category: p.category,
      };
      this.cdr.markForCheck();
    } catch (e) {
      await this.ui.error(e);
    }
  }

  private blank(): PlanPayload {
    const start = new Date(Date.now() + 2 * 3_600_000);
    start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
    return {
      type: 'ride', title: '', description: null, meeting_point: '', starts_at: toLocalInput(start), seats_total: 3,
      women_only: false, auto_accept: false, whatsapp_group_link: null, destination_id: null, price_per_person: null,
      course: null, category: null,
    };
  }
}
