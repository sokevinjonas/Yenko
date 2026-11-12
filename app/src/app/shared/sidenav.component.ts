import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ionic/angular';

import { AuthService } from '../core/auth.service';
import { NotificationsService } from '../core/notifications.service';

import { AvatarComponent } from './avatar.component';

/** Desktop navigation (≥ 992 px). Hidden by CSS on smaller screens, where the tab bar is used. */
@Component({
  selector: 'yk-sidenav',
  imports: [RouterLink, RouterLinkActive, IonIcon, AvatarComponent],
  template: `
    <nav class="yk-sidenav" aria-label="Main">
      <a class="yk-sidenav-logo yk-logo" routerLink="/tabs/explore" aria-label="Yenko home">yenko<span class="bang">!</span></a>
      <a class="yk-sidenav-create" routerLink="/tabs/create">
        <ion-icon name="add" aria-hidden="true"></ion-icon>Create a plan
      </a>
      @for (item of items; track item.path) {
        <a class="yk-sidenav-link" [routerLink]="item.path" routerLinkActive="active">
          <ion-icon [name]="item.icon" aria-hidden="true"></ion-icon>
          <span>{{ item.label }}</span>
          @if (item.path === '/tabs/notifications' && notifications.unread() > 0) {
            <span class="yk-sidenav-badge">{{ unread() }}</span>
          }
        </a>
      }
      <a class="yk-sidenav-link" routerLink="/safety" routerLinkActive="active">
        <ion-icon name="shield-checkmark-outline" aria-hidden="true"></ion-icon><span>Safety</span>
      </a>
      <div class="yk-kente yk-sidenav-kente" aria-hidden="true"></div>
      @if (auth.user(); as me) {
        <a class="yk-sidenav-me" routerLink="/tabs/profile">
          <yk-avatar [name]="me.name" [url]="me.avatar_url" [size]="40" />
          <span>
            <strong>{{ me.name }}</strong>
            <small>{{ me.hall?.name ?? 'Profile' }}</small>
          </span>
        </a>
      }
    </nav>
  `,
})
export class SidenavComponent {
  readonly notifications = inject(NotificationsService);
  readonly auth = inject(AuthService);
  readonly unread = computed(() => (this.notifications.unread() > 9 ? '9+' : String(this.notifications.unread())));
  readonly items = [
    { path: '/tabs/explore', label: 'Explore', icon: 'compass-outline' },
    { path: '/tabs/my-plans', label: 'My Plans', icon: 'calendar-outline' },
    { path: '/tabs/notifications', label: 'Alerts', icon: 'notifications-outline' },
    { path: '/tabs/profile', label: 'Profile', icon: 'person-outline' },
  ];
}
