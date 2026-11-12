import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon } from '@ionic/angular';

@Component({
  selector: 'yk-welcome',
  imports: [IonContent, IonButton, IonIcon, RouterLink],
  template: `
    <ion-content>
      <div class="yk-welcome">
        <div class="yk-welcome-main">
          <div class="yk-logo">yenko<span class="bang">!</span></div>
          <h1 class="yk-welcome-title">Share your ride,<br />find your squad.</h1>
          <div class="yk-welcome-points">
            <div><ion-icon name="car-outline" aria-hidden="true"></ion-icon>Split taxis and Bolts to Madina, the mall, the airport…</div>
            <div><ion-icon name="book-outline" aria-hidden="true"></ion-icon>Find a study group before exams</div>
            <div><ion-icon name="football-outline" aria-hidden="true"></ion-icon>Link up for football, outings and more</div>
            <div><ion-icon name="shield-checkmark-outline" aria-hidden="true"></ion-icon>Verified University of Ghana students only</div>
          </div>
        </div>
        <div class="yk-kente" aria-hidden="true"></div>
        <div class="yk-welcome-actions">
          <ion-button expand="block" routerLink="/register">Create my account</ion-button>
          <ion-button expand="block" fill="outline" color="secondary" routerLink="/login">I already have an account</ion-button>
        </div>
      </div>
    </ion-content>
  `,
})
export class WelcomePage {}
