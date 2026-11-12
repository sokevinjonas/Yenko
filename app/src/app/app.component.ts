import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

import { AuthService } from './core/auth.service';
import { NotificationsService } from './core/notifications.service';
import { PushService } from './core/push.service';

@Component({
  selector: 'yk-root',
  imports: [IonApp, IonRouterOutlet],
  template: `<ion-app><ion-router-outlet></ion-router-outlet></ion-app>`,
})
export class AppComponent {
  constructor() {
    // Start the unread-badge polling and push registration for a restored session.
    inject(NotificationsService);
    const auth = inject(AuthService);
    const push = inject(PushService);
    void auth.init().then(async () => {
      if (auth.isLoggedIn()) await push.register();
    });
  }
}
