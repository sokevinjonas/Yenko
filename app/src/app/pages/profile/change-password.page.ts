import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavController, IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonInput, IonInputPasswordToggle, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';

import { ApiService } from '../../core/api.service';
import { UiService } from '../../core/ui.service';

@Component({
  selector: 'yk-change-password',
  imports: [FormsModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonInput, IonInputPasswordToggle, IonButton, IonSpinner],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/profile" text=""></ion-back-button></ion-buttons>
        <ion-title>Change password</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="yk-kente" aria-hidden="true"></div>
      <form class="yk-page" (ngSubmit)="save()">
        <div class="yk-field">
          <ion-input class="yk-input" fill="outline" type="password" label="Current password" labelPlacement="floating"
            name="current" [(ngModel)]="current" autocomplete="current-password">
            <ion-input-password-toggle slot="end"></ion-input-password-toggle>
          </ion-input>
          @if (errors()['current_password']) { <div class="yk-field-error">{{ errors()['current_password'] }}</div> }
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
            name="confirm" [(ngModel)]="confirm" autocomplete="new-password"></ion-input>
        </div>
        <ion-button expand="block" type="submit" [disabled]="busy()">
          @if (busy()) { <ion-spinner name="crescent"></ion-spinner> } @else { Update password }
        </ion-button>
      </form>
    </ion-content>
  `,
})
export class ChangePasswordPage {
  private api = inject(ApiService);
  private ui = inject(UiService);
  private nav = inject(NavController);

  current = '';
  password = '';
  confirm = '';
  readonly busy = signal(false);
  readonly errors = signal<Record<string, string>>({});

  async save(): Promise<void> {
    if (this.password !== this.confirm) {
      this.errors.set({ password: "Passwords don't match." });
      return;
    }
    this.busy.set(true);
    this.errors.set({});
    try {
      await this.api.put('me/password', { current_password: this.current, password: this.password, password_confirmation: this.confirm });
      await this.ui.toast('Password updated.', 'success');
      this.nav.back();
    } catch (e) {
      this.errors.set(this.ui.fieldErrors(e));
      if (!Object.keys(this.errors()).length) await this.ui.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
