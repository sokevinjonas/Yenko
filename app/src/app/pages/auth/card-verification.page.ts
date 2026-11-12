import type { OnInit} from '@angular/core';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { compressImage } from '../../core/image';
import type { CardVerification } from '../../core/models';
import { UiService } from '../../core/ui.service';

@Component({
  selector: 'yk-card-verification',
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonButton, IonSpinner, IonIcon],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/verify" text=""></ion-back-button></ion-buttons>
        <ion-title>Student card</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="yk-kente" aria-hidden="true"></div>
      <div class="yk-page">
        @if (card()?.status === 'pending') {
          <div class="yk-success-box">
            <h3>We got your card</h3>
            <p style="margin: 0">Our team will check it soon. You can already browse plans and finish your profile.</p>
          </div>
          <ion-button expand="block" (click)="continue()">Continue</ion-button>
        } @else {
          @if (card()?.status === 'rejected') {
            <div class="yk-banner danger" style="margin: 0 0 16px">
              <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
              <div class="yk-banner-text"><strong>Your last photo was not approved</strong>{{ card()?.rejection_reason }}</div>
            </div>
          }
          <h1 style="margin: 4px 0 6px">Verify with your student card</h1>
          <p class="yk-muted" style="margin: 0 0 18px">
            Take a clear photo of the front of your card. Your name and student ID must be readable.
            Only the Yenko team sees this photo.
          </p>

          <input #file class="yk-hidden-input" type="file" accept="image/*" capture="environment" (change)="pick($event)" />
          @if (preview()) {
            <img class="yk-photo-preview" [src]="preview()" alt="Preview of your student card" />
          }
          <div class="yk-actions">
            <ion-button expand="block" fill="outline" color="secondary" (click)="file.click()">
              <ion-icon slot="start" name="camera-outline" aria-hidden="true"></ion-icon>
              {{ preview() ? 'Take another photo' : 'Take or choose a photo' }}
            </ion-button>
            <ion-button expand="block" [disabled]="!photo() || busy()" (click)="send()">
              @if (busy()) { <ion-spinner name="crescent"></ion-spinner> } @else { Send for review }
            </ion-button>
          </div>
        }
      </div>
    </ion-content>
  `,
})
export class CardVerificationPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private ui = inject(UiService);
  private router = inject(Router);

  readonly card = signal<CardVerification | null>(null);
  readonly photo = signal<File | null>(null);
  readonly preview = computed(() => (this.photo() ? URL.createObjectURL(this.photo()!) : null));
  readonly busy = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      this.card.set((await this.api.get<{ data: CardVerification | null }>('me/card-verification')).data);
    } catch (e) {
      await this.ui.error(e);
    }
  }

  pick(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.photo.set(file);
  }

  async send(): Promise<void> {
    const original = this.photo();
    if (!original) return;
    this.busy.set(true);
    const file = await compressImage(original, 1600, 0.85);
    this.busy.set(false);
    if (file.size > 5 * 1024 * 1024) {
      await this.ui.toast('This photo is too big (max 5 MB).', 'danger');
      return;
    }
    this.busy.set(true);
    try {
      const res = await this.api.upload<{ data: CardVerification }>('me/card-verification', 'photo', file, file.name);
      this.card.set(res.data);
      await this.auth.refresh();
    } catch (e) {
      await this.ui.error(e);
    } finally {
      this.busy.set(false);
    }
  }

  async continue(): Promise<void> {
    // Make sure we route with the latest account state (card now pending).
    await this.auth.refresh().catch(() => undefined);
    await this.router.navigateByUrl(this.auth.afterAuthRoute(), { replaceUrl: true });
  }
}
