import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonInput, IonInputPasswordToggle, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';

import { AuthService } from '../../core/auth.service';
import { PushService } from '../../core/push.service';
import { UiService } from '../../core/ui.service';

@Component({
  selector: 'yk-login',
  imports: [FormsModule, RouterLink, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonInput, IonInputPasswordToggle, IonButton, IonSpinner],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/welcome" text=""></ion-back-button></ion-buttons>
        <ion-title>Log in</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="yk-kente" aria-hidden="true"></div>
      <form class="yk-page" (ngSubmit)="submit()">
        <h1 style="margin: 8px 0 4px">Welcome back, chale!</h1>
        <p class="yk-muted" style="margin: 0 0 20px">Log in with your student ID or student email.</p>

        <div class="yk-field">
          <ion-input class="yk-input" fill="outline" label="Student ID or email" labelPlacement="floating"
            name="login" [(ngModel)]="login" autocomplete="username" required></ion-input>
          @if (errors()['login']) { <div class="yk-field-error">{{ errors()['login'] }}</div> }
        </div>
        <div class="yk-field">
          <ion-input class="yk-input" fill="outline" type="password" label="Password" labelPlacement="floating"
            name="password" [(ngModel)]="password" autocomplete="current-password" required>
            <ion-input-password-toggle slot="end"></ion-input-password-toggle>
          </ion-input>
          @if (errors()['password']) { <div class="yk-field-error">{{ errors()['password'] }}</div> }
        </div>

        <ion-button expand="block" type="submit" [disabled]="busy()">
          @if (busy()) { <ion-spinner name="crescent"></ion-spinner> } @else { Log in }
        </ion-button>

        <p class="yk-center" style="margin-top: 18px">
          <a class="yk-link" routerLink="/forgot-password">Forgot your password?</a>
        </p>
        <p class="yk-center yk-muted">
          New here? <a class="yk-link" routerLink="/register">Create an account</a>
        </p>
      </form>
    </ion-content>
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private ui = inject(UiService);
  private router = inject(Router);
  private push = inject(PushService);

  login = '';
  password = '';
  readonly busy = signal(false);
  readonly errors = signal<Record<string, string>>({});

  async submit(): Promise<void> {
    if (!this.login.trim() || !this.password) {
      this.errors.set({ login: !this.login.trim() ? 'Enter your student ID or email.' : '', password: !this.password ? 'Enter your password.' : '' });
      return;
    }
    this.busy.set(true);
    this.errors.set({});
    try {
      await this.auth.login(this.login.trim(), this.password);
      void this.push.register();
      await this.router.navigateByUrl(this.auth.nextRoute(), { replaceUrl: true });
    } catch (e) {
      this.errors.set(this.ui.fieldErrors(e));
      if (!Object.keys(this.errors()).length) await this.ui.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
