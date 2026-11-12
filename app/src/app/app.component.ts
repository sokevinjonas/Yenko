import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { filter, map } from 'rxjs';

import { AuthService } from './core/auth.service';
import { NotificationsService } from './core/notifications.service';
import { PushService } from './core/push.service';
import { SidenavComponent } from './shared/sidenav.component';

/** Pages of the main app (they get the desktop side navigation). */
const APP_AREAS = /^\/(tabs|plans|profile|safety)(\/|$)/;

@Component({
  selector: 'yk-root',
  imports: [IonApp, IonRouterOutlet, SidenavComponent],
  template: `
    <ion-app>
      @if (showNav()) {
        <yk-sidenav />
      }
      <ion-router-outlet [class.yk-with-sidenav]="showNav()"></ion-router-outlet>
    </ion-app>
  `,
})
export class AppComponent {
  private router = inject(Router);
  private auth = inject(AuthService);
  private url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  readonly showNav = computed(() => this.auth.isLoggedIn() && APP_AREAS.test(this.url()));

  constructor() {
    // Start the unread-badge polling and push registration for a restored session.
    inject(NotificationsService);
    const push = inject(PushService);
    void this.auth.init().then(async () => {
      if (this.auth.isLoggedIn()) await push.register();
    });
  }
}
