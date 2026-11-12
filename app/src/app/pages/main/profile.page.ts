import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AlertController, IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { prettyPhone } from '../../core/format';
import { PushService } from '../../core/push.service';
import { UiService } from '../../core/ui.service';
import { AccountBannerComponent } from '../../shared/account-banner.component';
import { AvatarComponent } from '../../shared/avatar.component';

@Component({
  selector: 'yk-profile',
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, AvatarComponent, AccountBannerComponent],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Profile</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      @if (auth.user(); as me) {
        <div class="yk-profile-head">
          <yk-avatar [name]="me.name" [url]="me.avatar_url" [size]="96" />
          <h2>{{ me.name }}</h2>
          <div class="yk-profile-sub">{{ me.hall?.name ?? 'No hall yet' }}</div>
          @if (me.is_verified) {
            <span class="yk-pill green"><ion-icon name="checkmark-circle" aria-hidden="true"></ion-icon>Verified student</span>
          } @else {
            <span class="yk-pill">Not verified yet</span>
          }
          @if (me.bio) { <p style="margin: 6px 0 0; max-width: 420px">{{ me.bio }}</p> }
        </div>
        <div class="yk-kente" aria-hidden="true"></div>
        <yk-account-banner />

        <div class="yk-page">
          <div class="yk-box">
            <div class="yk-row"><ion-icon name="id-card-outline" aria-hidden="true"></ion-icon><div class="yk-row-main"><div class="yk-row-sub">Student ID</div>{{ me.student_id ?? '—' }}</div></div>
            <div class="yk-row"><ion-icon name="mail-outline" aria-hidden="true"></ion-icon><div class="yk-row-main"><div class="yk-row-sub">Email</div>{{ me.email }}</div></div>
            <div class="yk-row"><ion-icon name="logo-whatsapp" aria-hidden="true"></ion-icon><div class="yk-row-main"><div class="yk-row-sub">WhatsApp</div>{{ phone(me.whatsapp) || '—' }}</div></div>
            <div class="yk-row"><ion-icon name="person-outline" aria-hidden="true"></ion-icon><div class="yk-row-main"><div class="yk-row-sub">Gender</div>{{ me.gender ? (me.gender === 'female' ? 'Female' : 'Male') : '—' }}</div></div>
          </div>
          <p class="yk-help" style="margin: -6px 4px 16px">Your student ID and email are never shown to other students.</p>

          <div class="yk-actions">
            <ion-button expand="block" fill="outline" color="secondary" routerLink="/profile/edit">Edit profile</ion-button>
            <ion-button expand="block" fill="outline" color="secondary" routerLink="/profile/password">Change password</ion-button>
            <ion-button expand="block" fill="outline" color="secondary" routerLink="/safety">Safety tips & rules</ion-button>
            <ion-button expand="block" (click)="logout()">Log out</ion-button>
            <ion-button expand="block" fill="clear" color="danger" (click)="deleteAccount()">Delete my account</ion-button>
          </div>
          <p class="yk-center yk-muted" style="font-size: 12px; margin-top: 18px">Yenko v1.0 · Made for Legon</p>
        </div>
      }
    </ion-content>
  `,
})
export class ProfilePage {
  readonly auth = inject(AuthService);
  private api = inject(ApiService);
  private ui = inject(UiService);
  private router = inject(Router);
  private push = inject(PushService);
  private alerts = inject(AlertController);
  readonly phone = prettyPhone;

  ionViewWillEnter(): void {
    void this.auth.refresh().catch(() => undefined);
  }

  async logout(): Promise<void> {
    await this.push.unregister();
    await this.auth.logout();
    await this.router.navigateByUrl('/welcome', { replaceUrl: true });
  }

  async deleteAccount(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Delete your account?',
      message: 'Your plans will be cancelled and your data removed. This cannot be undone.',
      inputs: [{ name: 'password', type: 'password', placeholder: 'Your password' }],
      buttons: [{ text: 'Keep my account', role: 'cancel' }, { text: 'Delete', role: 'destructive' }],
    });
    await alert.present();
    const res = await alert.onDidDismiss<{ values: { password: string } }>();
    if (res.role !== 'destructive') return;
    try {
      await this.api.delete('me', { password: res.data?.values.password ?? '' });
      await this.auth.clearSession();
      await this.ui.toast('Your account was deleted. Bye for now!');
      await this.router.navigateByUrl('/welcome', { replaceUrl: true });
    } catch (e) {
      await this.ui.error(e);
    }
  }
}
