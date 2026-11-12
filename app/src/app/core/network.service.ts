import { Injectable, signal } from '@angular/core';
import { Network } from '@capacitor/network';

/** Online/offline state for the whole app. */
@Injectable({ providedIn: 'root' })
export class NetworkService {
  readonly online = signal(navigator.onLine);

  constructor() {
    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
    void Network.getStatus()
      .then((s) => this.online.set(s.connected))
      .catch(() => undefined);
    void Network.addListener('networkStatusChange', (s) => this.online.set(s.connected)).catch(() => undefined);
  }
}
