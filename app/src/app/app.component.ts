import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { IonApp, IonIcon, IonRouterOutlet, ToastController } from '@ionic/angular';
import { filter, map } from 'rxjs';

import { AuthService } from './core/auth.service';
import { setupStatusBar } from './core/native';
import { NetworkService } from './core/network.service';
import { NotificationsService } from './core/notifications.service';
import { PushService } from './core/push.service';
import { SidenavComponent } from './shared/sidenav.component';

/** Pages of the main app (they get the desktop side navigation). */
const APP_AREAS = /^\/(tabs|plans|profile|safety)(\/|$)/;

@Component({
  selector: 'yk-root',
  imports: [IonApp, IonRouterOutlet, IonIcon, SidenavComponent],
  template: `
    <ion-app>
      @if (!network.online()) {
        <div class="yk-offline" role="status">
          <ion-icon name="cloud-offline-outline" aria-hidden="true"></ion-icon>
          You're offline — showing saved plans
        </div>
      }
      @if (showNav()) {
        <yk-sidenav />
      }
      <ion-router-outlet [class.yk-with-sidenav]="showNav()"></ion-router-outlet>
    </ion-app>
  `,
})
export class AppComponent {
  readonly network = inject(NetworkService);
  private router = inject(Router);
  private auth = inject(AuthService);
  private toasts = inject(ToastController);
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
    void setupStatusBar();
    this.watchForUpdates(inject(SwUpdate));
  }

  /** PWA: when a new version is downloaded, offer to reload. */
  private watchForUpdates(updates: SwUpdate): void {
    if (!updates.isEnabled) return;
    updates.versionUpdates.pipe(filter((e) => e.type === 'VERSION_READY')).subscribe(async () => {
      const toast = await this.toasts.create({
        message: 'A new version of Yenko is ready.',
        position: 'bottom',
        color: 'dark',
        buttons: [{ text: 'Reload', role: 'reload' }],
      });
      await toast.present();
      const { role } = await toast.onDidDismiss();
      if (role === 'reload') document.location.reload();
    });
  }
}
