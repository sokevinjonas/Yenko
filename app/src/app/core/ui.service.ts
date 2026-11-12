import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

/** Toasts, confirmations and API error helpers. */
@Injectable({ providedIn: 'root' })
export class UiService {
  private toasts = inject(ToastController);
  private alerts = inject(AlertController);

  async toast(message: string, color: 'success' | 'danger' | 'dark' = 'dark'): Promise<void> {
    const t = await this.toasts.create({ message, color, duration: 2600, position: 'top' });
    await t.present();
  }

  async error(err: unknown): Promise<void> {
    await this.toast(this.message(err), 'danger');
  }

  async confirm(header: string, message: string, okText = 'Yes', destructive = false): Promise<boolean> {
    const alert = await this.alerts.create({
      header,
      message,
      buttons: [
        { text: 'No', role: 'cancel' },
        { text: okText, role: destructive ? 'destructive' : 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm' || role === 'destructive';
  }

  /** Human message from an API error. */
  message(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'Network dey play. Check your connection and try again.';
      }
      const errors = err.error?.errors as Record<string, string[]> | undefined;
      if (errors) {
        const first = Object.values(errors)[0];
        if (first?.length) {
          return first[0];
        }
      }
      if (err.status === 429) {
        return err.error?.message ?? 'Too many tries. Wait a moment and try again.';
      }
      return err.error?.message || 'Something went wrong. Try again.';
    }
    return 'Something went wrong. Try again.';
  }

  /** Field → first validation message, for inline form errors. */
  fieldErrors(err: unknown): Record<string, string> {
    if (err instanceof HttpErrorResponse && err.status === 422 && err.error?.errors) {
      const out: Record<string, string> = {};
      for (const [field, messages] of Object.entries(err.error.errors as Record<string, string[]>)) {
        out[field] = messages[0];
      }
      return out;
    }
    return {};
  }
}
