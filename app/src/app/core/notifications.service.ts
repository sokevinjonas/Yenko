import { Injectable, effect, inject, signal } from '@angular/core';
import { App } from '@capacitor/app';

import { ApiService } from './api.service';
import { AuthService } from './auth.service';

/** Unread badge, refreshed every 60 s while the app is in the foreground. */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  readonly unread = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.start();
      } else {
        this.stop();
        this.unread.set(0);
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.refresh();
      }
    });
    void App.addListener('resume', () => void this.refresh()).catch(() => undefined);
  }

  async refresh(): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      return;
    }
    try {
      const { count } = await this.api.get<{ count: number }>('notifications/unread-count');
      this.unread.set(count);
    } catch {
      // ignore — next tick will retry
    }
  }

  private start(): void {
    if (this.timer) {
      return;
    }
    void this.refresh();
    this.timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void this.refresh();
      }
    }, 60_000);
  }

  private stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
