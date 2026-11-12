import { Component } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'yk-safety',
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonIcon],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/profile" text=""></ion-back-button></ion-buttons>
        <ion-title>Safety & rules</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="yk-kente" aria-hidden="true"></div>
      <div class="yk-page">
        <h1 style="margin: 4px 0 12px">Stay safe, chale</h1>
        @for (tip of tips; track tip.title) {
          <div class="yk-box" style="display: flex; gap: 12px">
            <ion-icon [name]="tip.icon" style="font-size: 26px; color: var(--yk-green); flex-shrink: 0" aria-hidden="true"></ion-icon>
            <div><strong>{{ tip.title }}</strong><p style="margin: 4px 0 0" class="yk-muted">{{ tip.text }}</p></div>
          </div>
        }
        <h2 style="font-size: 20px; margin: 22px 0 10px">Community rules</h2>
        <div class="yk-box">
          <ul style="margin: 0; padding-left: 20px; line-height: 1.7">
            <li>Use your real name and your own WhatsApp number.</li>
            <li>Be respectful — no harassment, no scams.</li>
            <li>If you can't make it, leave the plan so someone else can take your seat.</li>
            <li>Yenko doesn't handle payments: agree on the fare before the trip.</li>
            <li>After 3 reports from different students, an account is suspended until our team reviews it.</li>
          </ul>
        </div>
      </div>
    </ion-content>
  `,
})
export class SafetyPage {
  readonly tips = [
    { icon: 'shield-checkmark-outline', title: 'Only verified students', text: 'Everyone who can create or join a plan was verified with a student email or student card.' },
    { icon: 'people-outline', title: 'Meet in busy places', text: 'Pick meeting points on campus where people are around: hall gates, the library, the main gate.' },
    { icon: 'car-outline', title: 'Check the car', text: 'Before you get in, check the plate and driver match the Bolt/Uber app. Share your trip with a friend.' },
    { icon: 'female-outline', title: 'Women-only plans', text: 'Women can create rides only other women can join.' },
    { icon: 'flag-outline', title: 'Report problems', text: 'Wrong number, no-show, rude behaviour or scam? Use the flag button on the plan or member.' },
  ];
}
