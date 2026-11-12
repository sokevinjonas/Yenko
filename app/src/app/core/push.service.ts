import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

import { environment } from '../../environments/environment';

import { ApiService } from './api.service';
import { NotificationsService } from './notifications.service';

/**
 * Firebase push notifications. Ready but inactive until `environment.pushEnabled` is true
 * and the Android project has its google-services.json.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private api = inject(ApiService);
  private router = inject(Router);
  private notifications = inject(NotificationsService);
  private currentToken: string | null = null;
  private listening = false;

  get available(): boolean {
    return environment.pushEnabled && Capacitor.isNativePlatform();
  }

  async register(): Promise<void> {
    if (!this.available) {
      return;
    }
    if (!this.listening) {
      this.listening = true;
      await PushNotifications.addListener('registration', async ({ value }) => {
        this.currentToken = value;
        await this.api.post('device-tokens', { token: value, platform: Capacitor.getPlatform() }).catch(() => undefined);
      });
      await PushNotifications.addListener('pushNotificationReceived', () => void this.notifications.refresh());
      await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        const planId = notification.data?.plan_id;
        void this.router.navigateByUrl(planId ? `/plans/${planId}` : '/tabs/notifications');
      });
    }
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive === 'granted') {
      await PushNotifications.register();
    }
  }

  async unregister(): Promise<void> {
    if (!this.available || !this.currentToken) {
      return;
    }
    await this.api.delete('device-tokens', { token: this.currentToken }).catch(() => undefined);
    this.currentToken = null;
  }
}
