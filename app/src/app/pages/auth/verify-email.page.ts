import type { OnDestroy} from '@angular/core';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import type { Me } from '../../core/models';
import { UiService } from '../../core/ui.service';

@Component({
  selector: 'yk-verify-email',
  imports: [FormsModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonInput, IonSpinner, IonIcon],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Verify your account</ion-title>
        <ion-buttons slot="end"><ion-button (click)="logout()">Log out</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="yk-kente" aria-hidden="true"></div>
      <form class="yk-page" (ngSubmit)="submit()">
        <div class="yk-center" style="font-size: 52px; color: var(--yk-gold)"><ion-icon name="mail-unread-outline" aria-hidden="true"></ion-icon></div>
        <h1 class="yk-center" style="margin: 4px 0 6px">Check your student email</h1>
        <p class="yk-center yk-muted" style="margin: 0 0 22px">We sent a 6-digit code to<br /><strong style="color: var(--yk-ink)">{{ email() }}</strong></p>

        <div class="yk-field">
          <ion-input class="yk-input yk-code-input" fill="outline" name="code" [(ngModel)]="code" inputmode="numeric"
            maxlength="6" autocomplete="one-time-code" aria-label="Verification code" placeholder="••••••"></ion-input>
          @if (error()) { <div class="yk-field-error yk-center">{{ error() }}</div> }
        </div>

        <ion-button expand="block" type="submit" [disabled]="busy()">
          @if (busy()) { <ion-spinner name="crescent"></ion-spinner> } @else { Verify }
        </ion-button>

        <p class="yk-center" style="margin-top: 18px">
          @if (wait() > 0) {
            <span class="yk-muted">Resend code in {{ wait() }} s</span>
          } @else {
            <button type="button" class="yk-link" (click)="resend()">Send me a new code</button>
          }
        </p>

        <div class="yk-box" style="margin-top: 28px">
          <h3>Can't open your student email?</h3>
          <p class="yk-muted" style="margin: 0 0 12px">Send a photo of your student card instead. Our team will check it.</p>
          <ion-button expand="block" fill="outline" color="secondary" routerLink="/card-verification">Use my student card</ion-button>
        </div>
      </form>
    </ion-content>
  `,
})
export class VerifyEmailPage implements OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private ui = inject(UiService);
  private router = inject(Router);

  code = '';
  readonly busy = signal(false);
  readonly error = signal('');
  readonly wait = signal(60);
  readonly email = computed(() => this.auth.user()?.email ?? '');
  private timer = setInterval(() => this.wait.update((w) => Math.max(0, w - 1)), 1000);

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  async submit(): Promise<void> {
    const code = this.code.replace(/\D/g, '');
    if (code.length !== 6) {
      this.error.set('Enter the 6 digits from the email.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      this.auth.setUser(await this.api.post<Me>('auth/verify-email', { code }));
      await this.ui.toast("You're verified! 🎉", 'success');
      await this.router.navigateByUrl(this.auth.nextRoute(), { replaceUrl: true });
    } catch (e) {
      this.error.set(this.ui.fieldErrors(e)['code'] ?? this.ui.message(e));
    } finally {
      this.busy.set(false);
    }
  }

  async resend(): Promise<void> {
    try {
      const res = await this.api.post<{ message: string; retry_after: number }>('auth/resend-code');
      this.wait.set(res.retry_after);
      await this.ui.toast(res.message, 'success');
    } catch (e: unknown) {
      const retry = (e as { error?: { retry_after?: number } }).error?.retry_after;
      if (retry) this.wait.set(retry);
      await this.ui.error(e);
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/welcome', { replaceUrl: true });
  }
}
