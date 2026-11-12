import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';

import { AuthService } from '../core/auth.service';

/** Tells the user why they can't create/join plans yet, with a link to fix it. */
@Component({
  selector: 'yk-account-banner',
  imports: [RouterLink, IonIcon],
  template: `
    @if (state(); as s) {
      <div class="yk-banner" [class.danger]="s.danger">
        <ion-icon [name]="s.icon" aria-hidden="true"></ion-icon>
        <div class="yk-banner-text">
          <strong>{{ s.title }}</strong>
          {{ s.text }}
        </div>
        @if (s.link) {
          <a class="yk-link" [routerLink]="s.link">{{ s.action }}</a>
        }
      </div>
    }
  `,
})
export class AccountBannerComponent {
  private auth = inject(AuthService);

  readonly state = computed(() => {
    const me = this.auth.user();
    if (!me) return null;
    switch (me.participation_blocker) {
      case 'suspended':
        return {
          danger: true, icon: 'ban-outline', title: 'Account suspended',
          text: me.suspension_reason ?? 'You can browse plans but not create or join them.', link: null, action: '',
        };
      case 'not_verified':
        return me.card_verification?.status === 'pending'
          ? { danger: false, icon: 'hourglass-outline', title: 'Student card under review',
              text: "You'll be able to join plans once it's approved.", link: null, action: '' }
          : { danger: false, icon: 'shield-checkmark-outline', title: 'Verify your student account',
              text: 'Only verified students can create or join plans.', link: '/verify', action: 'Verify' };
      case 'profile_incomplete':
        return { danger: false, icon: 'person-circle-outline', title: 'Finish your profile',
          text: 'Add your hall, WhatsApp and gender.', link: '/complete-profile', action: 'Finish' };
      default:
        return null;
    }
  });
}
