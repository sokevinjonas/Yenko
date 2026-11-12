import type { ActionSheetController, AlertController } from '@ionic/angular';

import type { ApiService } from '../../core/api.service';
import { REPORT_REASONS } from '../../core/format';
import type { ReportReason } from '../../core/models';
import type { UiService } from '../../core/ui.service';

/** Ask for a reason and details, then send a report. */
export async function reportUser(
  deps: { sheets: ActionSheetController; alerts: AlertController; api: ApiService; ui: UiService },
  user: { id: number; name: string },
  planId?: number,
): Promise<void> {
  const sheet = await deps.sheets.create({
    header: `Report ${user.name}`,
    subHeader: 'Our team reviews every report. After several reports, the account is suspended.',
    buttons: [
      ...(Object.entries(REPORT_REASONS) as [ReportReason, string][]).map(([reason, text]) => ({ text, data: reason })),
      { text: 'Cancel', role: 'cancel' },
    ],
  });
  await sheet.present();
  const { data: reason, role } = await sheet.onDidDismiss<ReportReason>();
  if (role === 'cancel' || !reason) return;

  const alert = await deps.alerts.create({
    header: 'Anything to add?',
    inputs: [{ name: 'details', type: 'textarea', placeholder: 'What happened? (optional)', attributes: { maxlength: 500 } }],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Send report', role: 'confirm' }],
  });
  await alert.present();
  const res = await alert.onDidDismiss<{ values: { details: string } }>();
  if (res.role !== 'confirm') return;

  try {
    const out = await deps.api.post<{ message: string }>('reports', {
      reported_user_id: user.id, plan_id: planId ?? null, reason, details: res.data?.values.details || null,
    });
    await deps.ui.toast(out.message, 'success');
  } catch (e) {
    await deps.ui.error(e);
  }
}
