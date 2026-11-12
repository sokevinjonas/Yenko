import type { OnInit} from '@angular/core';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonHeader, IonInput, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import type { Gender, Me } from '../../core/models';
import { ReferenceService } from '../../core/reference.service';
import { UiService } from '../../core/ui.service';
import { AvatarComponent } from '../../shared/avatar.component';

@Component({
  selector: 'yk-complete-profile',
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonInput, IonSelect, IonSelectOption, IonSegment, IonSegmentButton, IonSpinner, AvatarComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Your profile</ion-title>
        <ion-buttons slot="end"><ion-button (click)="logout()">Log out</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="yk-kente" aria-hidden="true"></div>
      <form class="yk-page" (ngSubmit)="save()">
        <h1 style="margin: 4px 0 6px">Almost there, {{ firstName() }}!</h1>
        <p class="yk-muted" style="margin: 0 0 18px">This helps other students know who they're linking up with.</p>

        <div class="yk-center" style="margin-bottom: 18px">
          <input #file class="yk-hidden-input" type="file" accept="image/*" (change)="pickAvatar($event)" />
          <button type="button" (click)="file.click()" style="background: none; border: none; padding: 0; cursor: pointer" aria-label="Change profile photo">
            <yk-avatar [name]="auth.user()?.name ?? ''" [url]="auth.user()?.avatar_url ?? null" [size]="88" />
          </button>
          <div><button type="button" class="yk-link" (click)="file.click()">{{ uploading() ? 'Uploading…' : 'Add a photo (optional)' }}</button></div>
        </div>

        <div class="yk-field">
          <ion-select class="yk-input" fill="outline" label="Your hall" labelPlacement="floating" interface="action-sheet"
            name="hall" [(ngModel)]="hallId">
            @for (h of ref.halls(); track h.id) { <ion-select-option [value]="h.id">{{ h.name }}</ion-select-option> }
          </ion-select>
          @if (errors()['hall_id']) { <div class="yk-field-error">{{ errors()['hall_id'] }}</div> }
        </div>

        <div class="yk-field">
          <ion-input class="yk-input" fill="outline" label="WhatsApp number" labelPlacement="floating" type="tel" inputmode="tel"
            name="whatsapp" [(ngModel)]="whatsapp" placeholder="024 123 4567"></ion-input>
          @if (errors()['whatsapp']) {
            <div class="yk-field-error">{{ errors()['whatsapp'] }}</div>
          } @else {
            <div class="yk-help">Only shown to people you accept, or whose plan you join.</div>
          }
        </div>

        @if (!lockedGender()) {
          <span class="yk-label">Gender</span>
          <ion-segment class="yk-segment" style="margin: 0 0 4px" name="gender" [(ngModel)]="gender">
            <ion-segment-button value="female">Female</ion-segment-button>
            <ion-segment-button value="male">Male</ion-segment-button>
          </ion-segment>
          @if (errors()['gender']) {
            <div class="yk-field-error">{{ errors()['gender'] }}</div>
          } @else {
            <div class="yk-help">Used for women-only rides. It can't be changed later.</div>
          }
        }

        <ion-button expand="block" type="submit" style="margin-top: 22px" [disabled]="busy()">
          @if (busy()) { <ion-spinner name="crescent"></ion-spinner> } @else { Let's go — Yenko! }
        </ion-button>
      </form>
    </ion-content>
  `,
})
export class CompleteProfilePage implements OnInit {
  readonly auth = inject(AuthService);
  readonly ref = inject(ReferenceService);
  private api = inject(ApiService);
  private ui = inject(UiService);
  private router = inject(Router);

  hallId: number | null = null;
  whatsapp = '';
  gender: Gender | null = null;
  readonly busy = signal(false);
  readonly uploading = signal(false);
  readonly errors = signal<Record<string, string>>({});
  readonly lockedGender = signal(false);
  readonly firstName = (): string => (this.auth.user()?.name ?? '').split(' ')[0];

  async ngOnInit(): Promise<void> {
    const me = this.auth.user();
    this.hallId = me?.hall?.id ?? null;
    this.whatsapp = me?.whatsapp ?? '';
    this.gender = me?.gender ?? null;
    this.lockedGender.set(!!me?.gender);
    await this.ref.load().catch((e) => this.ui.error(e));
  }

  async pickAvatar(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading.set(true);
    try {
      this.auth.setUser(await this.api.upload<Me>('me/avatar', 'avatar', file, file.name));
    } catch (e) {
      await this.ui.error(e);
    } finally {
      this.uploading.set(false);
    }
  }

  async save(): Promise<void> {
    const local: Record<string, string> = {};
    if (!this.hallId) local['hall_id'] = 'Pick your hall.';
    if (!this.whatsapp.trim()) local['whatsapp'] = 'Add your WhatsApp number.';
    if (!this.gender) local['gender'] = 'Pick one.';
    this.errors.set(local);
    if (Object.keys(local).length) return;

    this.busy.set(true);
    try {
      const body: Record<string, unknown> = { hall_id: this.hallId, whatsapp: this.whatsapp.trim() };
      if (!this.lockedGender()) body['gender'] = this.gender;
      this.auth.setUser(await this.api.put<Me>('me', body));
      await this.router.navigateByUrl('/tabs/explore', { replaceUrl: true });
    } catch (e) {
      this.errors.set(this.ui.fieldErrors(e));
      if (!Object.keys(this.errors()).length) await this.ui.error(e);
    } finally {
      this.busy.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/welcome', { replaceUrl: true });
  }
}
