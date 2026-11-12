import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonInput, IonInputPasswordToggle, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';

import { AuthService } from '../../core/auth.service';
import { UiService } from '../../core/ui.service';

export const STUDENT_DOMAIN = 'st.ug.edu.gh';

@Component({
  selector: 'yk-register',
  imports: [FormsModule, RouterLink, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonInput, IonInputPasswordToggle, IonButton, IonSpinner],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/welcome" text=""></ion-back-button></ion-buttons>
        <ion-title>Create account</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="yk-kente" aria-hidden="true"></div>
      <form class="yk-page" (ngSubmit)="submit()">
        <h1 style="margin: 8px 0 4px">Akwaaba!</h1>
        <p class="yk-muted" style="margin: 0 0 20px">Yenko is only for University of Ghana students. We'll send a code to your student email.</p>

        @for (f of fields; track f.name) {
          <div class="yk-field">
            <ion-input class="yk-input" fill="outline" labelPlacement="floating"
              [label]="f.label" [type]="f.type" [name]="f.name" [inputmode]="f.inputmode" [autocomplete]="f.autocomplete"
              [placeholder]="f.placeholder" [(ngModel)]="form[f.name]">
              @if (f.type === 'password') { <ion-input-password-toggle slot="end"></ion-input-password-toggle> }
            </ion-input>
            @if (errors()[f.name]) {
              <div class="yk-field-error">{{ errors()[f.name] }}</div>
            } @else if (f.help) {
              <div class="yk-help">{{ f.help }}</div>
            }
          </div>
        }

        <ion-button expand="block" type="submit" [disabled]="busy()">
          @if (busy()) { <ion-spinner name="crescent"></ion-spinner> } @else { Create my account }
        </ion-button>
        <p class="yk-center yk-muted" style="margin-top: 18px">
          Already have an account? <a class="yk-link" routerLink="/login">Log in</a>
        </p>
      </form>
    </ion-content>
  `,
})
export class RegisterPage {
  private auth = inject(AuthService);
  private ui = inject(UiService);
  private router = inject(Router);

  readonly fields = [
    { name: 'student_id', label: 'Student ID', type: 'text', inputmode: 'numeric', autocomplete: 'off', placeholder: '10812345', help: 'The number on your student card.' },
    { name: 'name', label: 'Full name', type: 'text', inputmode: 'text', autocomplete: 'name', placeholder: 'Kofi Mensah', help: '' },
    { name: 'email', label: 'Student email', type: 'email', inputmode: 'email', autocomplete: 'email', placeholder: `you@${STUDENT_DOMAIN}`, help: `Must end with @${STUDENT_DOMAIN}` },
    { name: 'password', label: 'Password', type: 'password', inputmode: 'text', autocomplete: 'new-password', placeholder: '', help: 'At least 8 characters.' },
    { name: 'password_confirmation', label: 'Confirm password', type: 'password', inputmode: 'text', autocomplete: 'new-password', placeholder: '', help: '' },
  ] as const;

  form: Record<'student_id' | 'name' | 'email' | 'password' | 'password_confirmation', string> = {
    student_id: '', name: '', email: '', password: '', password_confirmation: '',
  };
  readonly busy = signal(false);
  readonly errors = signal<Record<string, string>>({});

  async submit(): Promise<void> {
    const local: Record<string, string> = {};
    if (!/^\d{8,10}$/.test(this.form.student_id.trim())) local['student_id'] = 'Your student ID should be 8 to 10 digits.';
    if (this.form.name.trim().length < 2) local['name'] = 'Enter your name.';
    if (!this.form.email.trim().toLowerCase().endsWith('@' + STUDENT_DOMAIN)) local['email'] = `Use your student email (@${STUDENT_DOMAIN}).`;
    if (this.form.password.length < 8) local['password'] = 'At least 8 characters.';
    if (this.form.password !== this.form.password_confirmation) local['password_confirmation'] = "Passwords don't match.";
    this.errors.set(local);
    if (Object.keys(local).length) return;

    this.busy.set(true);
    try {
      await this.auth.register({ ...this.form, student_id: this.form.student_id.trim(), email: this.form.email.trim().toLowerCase(), name: this.form.name.trim() });
      await this.router.navigateByUrl('/verify', { replaceUrl: true });
    } catch (e) {
      this.errors.set(this.ui.fieldErrors(e));
      if (!Object.keys(this.errors()).length) await this.ui.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
