import { Injectable, computed, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import { ApiService } from './api.service';
import type { AuthResponse, Me } from './models';

const TOKEN_KEY = 'yenko.token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);

  readonly token = signal<string | null>(null);
  readonly user = signal<Me | null>(null);
  readonly isLoggedIn = computed(() => !!this.token());

  private readyPromise: Promise<void> | null = null;

  /** Restore the session once at startup. */
  init(): Promise<void> {
    this.readyPromise ??= (async () => {
      const { value } = await Preferences.get({ key: TOKEN_KEY });
      if (!value) {
        return;
      }
      this.token.set(value);
      try {
        await this.refresh();
      } catch (e: unknown) {
        if ((e as { status?: number })?.status === 401) {
          await this.clearSession();
        }
      }
    })();
    return this.readyPromise;
  }

  async login(login: string, password: string): Promise<Me> {
    return this.startSession(await this.api.post<AuthResponse>('auth/login', { login, password, device_name: 'Yenko app' }));
  }

  async register(data: { student_id: string; name: string; email: string; password: string; password_confirmation: string }): Promise<Me> {
    return this.startSession(await this.api.post<AuthResponse>('auth/register', { ...data, device_name: 'Yenko app' }));
  }

  async refresh(): Promise<Me> {
    const me = await this.api.get<Me>('me');
    this.user.set(me);
    return me;
  }

  setUser(me: Me): void {
    this.user.set(me);
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('auth/logout');
    } catch {
      // token may already be invalid — nothing to do
    }
    await this.clearSession();
  }

  async clearSession(): Promise<void> {
    this.token.set(null);
    this.user.set(null);
    await Preferences.remove({ key: TOKEN_KEY });
  }

  /** Where the user should be, given how far they are in onboarding. */
  nextRoute(): string {
    const me = this.user();
    if (!this.token() || !me) {
      return '/welcome';
    }
    const cardPending = me.card_verification?.status === 'pending';
    if (!me.is_verified && !cardPending) {
      return '/verify';
    }
    if (!me.profile_complete) {
      return '/complete-profile';
    }
    return '/tabs/explore';
  }

  private async startSession(res: AuthResponse): Promise<Me> {
    this.token.set(res.token);
    this.user.set(res.user);
    await Preferences.set({ key: TOKEN_KEY, value: res.token });
    return res.user;
  }
}
