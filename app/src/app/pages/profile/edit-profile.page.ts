import type { OnInit} from '@angular/core';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavController,
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonInput, IonSegment, IonSegmentButton, IonSelect,
  IonSelectOption, IonSpinner, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { compressImage } from '../../core/image';
import type { Gender, Me } from '../../core/models';
import { ReferenceService } from '../../core/reference.service';
import { UiService } from '../../core/ui.service';
import { AvatarComponent } from '../../shared/avatar.component';

@Component({
  selector: 'yk-edit-profile',
  imports: [
    FormsModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonInput, IonTextarea, IonSelect,
    IonSelectOption, IonSegment, IonSegmentButton, IonButton, IonSpinner, AvatarComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/profile" text=""></ion-back-button></ion-buttons>
        <ion-title>Edit profile</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="yk-kente" aria-hidden="true"></div>
      <form class="yk-page" (ngSubmit)="save()">
        <div class="yk-center" style="margin-bottom: 18px">
          <input #file class="yk-hidden-input" type="file" accept="image/*" (change)="pickAvatar($event)" />
          <button type="button" (click)="file.click()" style="background: none; border: none; padding: 0; cursor: pointer" aria-label="Change profile photo">
            <yk-avatar [name]="auth.user()?.name ?? ''" [url]="auth.user()?.avatar_url ?? null" [size]="96" />
          </button>
          <div><button type="button" class="yk-link" (click)="file.click()">{{ uploading() ? 'Uploading…' : 'Change photo' }}</button></div>
        </div>

        <div class="yk-field">
          <ion-input class="yk-input" fill="outline" label="Full name" labelPlacement="floating" name="name" [(ngModel)]="name" maxlength="60"></ion-input>
          @if (errors()['name']) { <div class="yk-field-error">{{ errors()['name'] }}</div> }
        </div>
        <div class="yk-field">
          <ion-select class="yk-input" fill="outline" label="Hall" labelPlacement="floating" interface="action-sheet" name="hall" [(ngModel)]="hallId">
            @for (h of ref.halls(); track h.id) { <ion-select-option [value]="h.id">{{ h.name }}</ion-select-option> }
          </ion-select>
        </div>
        <div class="yk-field">
          <ion-input class="yk-input" fill="outline" label="WhatsApp number" labelPlacement="floating" type="tel" inputmode="tel"
            name="whatsapp" [(ngModel)]="whatsapp"></ion-input>
          @if (errors()['whatsapp']) { <div class="yk-field-error">{{ errors()['whatsapp'] }}</div> }
        </div>
        <div class="yk-field">
          <ion-textarea class="yk-input" fill="outline" label="Short bio (optional)" labelPlacement="floating" name="bio"
            [(ngModel)]="bio" maxlength="160" [counter]="true" [autoGrow]="true" placeholder="Level 300 · Computer Science · Arsenal fan"></ion-textarea>
        </div>
        @if (!auth.user()?.gender) {
          <span class="yk-label">Gender</span>
          <ion-segment class="yk-segment" style="margin: 0 0 4px" name="gender" [(ngModel)]="gender">
            <ion-segment-button value="female">Female</ion-segment-button>
            <ion-segment-button value="male">Male</ion-segment-button>
          </ion-segment>
          <div class="yk-help">Can't be changed later.</div>
        }

        <ion-button expand="block" type="submit" style="margin-top: 20px" [disabled]="busy()">
          @if (busy()) { <ion-spinner name="crescent"></ion-spinner> } @else { Save }
        </ion-button>
      </form>
    </ion-content>
  `,
})
export class EditProfilePage implements OnInit {
  readonly auth = inject(AuthService);
  readonly ref = inject(ReferenceService);
  private api = inject(ApiService);
  private ui = inject(UiService);
  private nav = inject(NavController);

  name = '';
  hallId: number | null = null;
  whatsapp = '';
  bio = '';
  gender: Gender | null = null;
  readonly busy = signal(false);
  readonly uploading = signal(false);
  readonly errors = signal<Record<string, string>>({});

  async ngOnInit(): Promise<void> {
    const me = this.auth.user();
    this.name = me?.name ?? '';
    this.hallId = me?.hall?.id ?? null;
    this.whatsapp = me?.whatsapp ?? '';
    this.bio = me?.bio ?? '';
    await this.ref.load().catch((e) => this.ui.error(e));
  }

  async pickAvatar(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading.set(true);
    try {
      const small = await compressImage(file, 600, 0.85);
      this.auth.setUser(await this.api.upload<Me>('me/avatar', 'avatar', small, small.name));
    } catch (e) {
      await this.ui.error(e);
    } finally {
      this.uploading.set(false);
    }
  }

  async save(): Promise<void> {
    this.busy.set(true);
    this.errors.set({});
    try {
      const body: Record<string, unknown> = { name: this.name.trim(), hall_id: this.hallId, whatsapp: this.whatsapp.trim() || null, bio: this.bio.trim() || null };
      if (!this.auth.user()?.gender && this.gender) body['gender'] = this.gender;
      this.auth.setUser(await this.api.put<Me>('me', body));
      await this.ui.toast('Profile saved.', 'success');
      this.nav.back();
    } catch (e) {
      this.errors.set(this.ui.fieldErrors(e));
      if (!Object.keys(this.errors()).length) await this.ui.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
