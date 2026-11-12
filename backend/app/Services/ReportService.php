<?php

namespace App\Services;

use App\Enums\ReportStatus;
use App\Models\Report;
use App\Models\User;
use App\Notifications\YenkoNotification as N;

class ReportService
{
    public function create(User $reporter, array $data): Report
    {
        abort_if((int) $data['reported_user_id'] === $reporter->id, 422, "You can't report yourself.");

        $duplicate = Report::where('reporter_id', $reporter->id)
            ->where('reported_user_id', $data['reported_user_id'])
            ->where('reason', $data['reason'])
            ->exists();
        abort_if($duplicate, 422, 'You already reported this person for this reason.');

        $report = Report::create([...$data, 'reporter_id' => $reporter->id, 'status' => ReportStatus::Open]);

        $this->autoSuspendIfNeeded($report->reportedUser);

        return $report;
    }

    /** Suspend automatically once enough different people have open reports against a user. */
    public function autoSuspendIfNeeded(User $user): void
    {
        if ($user->is_suspended || $user->is_admin) {
            return;
        }
        $distinctReporters = Report::where('reported_user_id', $user->id)
            ->where('status', ReportStatus::Open)
            ->distinct()->count('reporter_id');

        if ($distinctReporters >= config('yenko.reports.auto_suspend_threshold')) {
            $this->suspend($user, 'Automatically suspended after several reports. An admin will review your account.');
        }
    }

    public function suspend(User $user, string $reason): void
    {
        $user->suspend($reason);
        $user->notify(new N(N::ACCOUNT_SUSPENDED, 'Account suspended', $reason));
    }
}
