import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';

export const isNative = (): boolean => Capacitor.isNativePlatform();

/** Open a link outside the app (WhatsApp, group invites). In the native app, Android hands wa.me links to WhatsApp. */
export async function openExternal(url: string): Promise<void> {
  if (isNative()) {
    try {
      await AppLauncher.openUrl({ url });
      return;
    } catch {
      // fall back to the browser
    }
  }
  window.open(url, '_blank', 'noopener');
}

/** Light vibration on success (native only). */
export function tap(): void {
  if (isNative()) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}

/** Green status bar with light icons, matching the toolbars (native only). */
export async function setupStatusBar(): Promise<void> {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0B6E4F' });
    }
  } catch {
    // plugin not available
  }
}
