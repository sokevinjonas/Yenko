import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonInput, IonInputPasswordToggle, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';

import { ApiService } from '../../core/api.service';
import { UiService } from '../../core/ui.service';

@Component({
  selector: 'yk-forgot-password',
  imports: [FormsModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonInput, IonInputPasswordToggle, IonButton, IonSpinner],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/login" text=""></ion-back-button></ion-buttons>
        <ion-title>Reset password</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="yk-kente" aria-hidden="true"></div>
      <form class="yk-page" (ngSubmit)="step() === 1 ? sendCode() : reset()">
        @if (step() === 1) {
          <h1 style="margin: 8px 0 4px">Forgot your password?</h1>
          <p class="yk-muted" style="margin: 0 0 20px">Enter your student email and we'll send you a code.</p>
          <div class="yk-field">
            <ion-input class="yk-input" fill="outline" label="Student email" labelPlacement="floating" type="email"
              name="email" [(ngModel)]="email" autocomplete="email"></ion-input>
            @if (errors()['email']) { <div class="yk-field-error">{{ errors()['email'] }}</div> }
          </div>
          <ion-button expand="block" type="submit" [disabled]="busy()">
            @if (busy()) { <ion-spinner name="crescent"></ion-spinner> } @else { Send code }
          </ion-button>
        } @else {
          <h1 style="margin: 8px 0 4px">Check your email</h1>
          <p class="yk-muted" style="margin: 0 0 20px">Enter the code sent to <strong>{{ email }}</strong> and choose a new password.</p>
          <div class="yk-field">
            <ion-input class="yk-input yk-code-input" fill="outline" name="code" [(ngModel)]="code" inputmode="numeric"
              maxlength="6" autocomplete="one-time-code" aria-label="Code" placeholder="••••••"></ion-input>
            @if (errors()['code']) { <div class="yk-field-error">{{ errors()['code'] }}</div> }
          </div>
          <div class="yk-field">
            <ion-input class="yk-input" fill="outline" type="password" label="New password" labelPlacement="floating"
              name="password" [(ngModel)]="password" autocomplete="new-password">
              <ion-input-password-toggle slot="end"></ion-input-password-toggle>
            </ion-input>
            @if (errors()['password']) { <div class="yk-field-error">{{ errors()['password'] }}</div> }
          </div>
          <div class="yk-field">
            <ion-input class="yk-input" fill="outline" type="password" label="Confirm new password" labelPlacement="floating"
              name="password_confirmation" [(ngModel)]="confirm" autocomplete="new-password"></ion-input>
          </div>
          <ion-button expand="block" type="submit" [disabled]="busy()">
            @if (busy()) { <ion-spinner name="crescent"></ion-spinner> } @else { Update password }
          </ion-button>
        }
      </form>
    </ion-content>
  `,
})
export class ForgotPasswordPage {
  private api = inject(ApiService);
  private ui = inject(UiService);
  private router = inject(Router);

  email = '';
  code = '';
  password = '';
  confirm = '';
  readonly step = signal<1 | 2>(1);
  readonly busy = signal(false);
  readonly errors = signal<Record<string, string>>({});

  async sendCode(): Promise<void> {
    if (!this.email.includes('@')) {
      this.errors.set({ email: 'Enter your student email.' });
      return;
    }
    await this.run(async () => {
      const res = await this.api.post<{ message: string }>('auth/forgot-password', { email: this.email.trim().toLowerCase() });
      await this.ui.toast(res.message, 'success');
      this.step.set(2);
    });
  }

  async reset(): Promise<void> {
    if (this.password !== this.confirm) {
      this.errors.set({ password: "Passwords don't match." });
      return;
    }
    await this.run(async () => {
      const res = await this.api.post<{ message: string }>('auth/reset-password', {
        email: this.email.trim().toLowerCase(), code: this.code.replace(/\D/g, ''),
        password: this.password, password_confirmation: this.confirm,
      });
      await this.ui.toast(res.message, 'success');
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    });
  }

  private async run(fn: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.errors.set({});
    try {
      await fn();
    } catch (e) {
      this.errors.set(this.ui.fieldErrors(e));
      if (!Object.keys(this.errors()).length) await this.ui.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
