import { Component, inject } from '@angular/core';
import { IonBadge, IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';

import { NotificationsService } from '../../core/notifications.service';

@Component({
  selector: 'yk-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="explore" href="/tabs/explore">
          <ion-icon name="compass-outline" aria-hidden="true"></ion-icon>
          <ion-label>Explore</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="my-plans" href="/tabs/my-plans">
          <ion-icon name="calendar-outline" aria-hidden="true"></ion-icon>
          <ion-label>My Plans</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="create" href="/tabs/create" class="yk-create-tab" aria-label="Create a plan">
          <span class="yk-create-circle"><ion-icon name="add" aria-hidden="true"></ion-icon></span>
        </ion-tab-button>
        <ion-tab-button tab="notifications" href="/tabs/notifications">
          <ion-icon name="notifications-outline" aria-hidden="true"></ion-icon>
          <ion-label>Alerts</ion-label>
          @if (notifications.unread() > 0) {
            <ion-badge color="primary">{{ notifications.unread() > 9 ? '9+' : notifications.unread() }}</ion-badge>
          }
        </ion-tab-button>
        <ion-tab-button tab="profile" href="/tabs/profile">
          <ion-icon name="person-outline" aria-hidden="true"></ion-icon>
          <ion-label>Profile</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsPage {
  readonly notifications = inject(NotificationsService);
}
