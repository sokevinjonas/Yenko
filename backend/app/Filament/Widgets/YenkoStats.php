<?php

namespace App\Filament\Widgets;

use App\Enums\CardStatus;
use App\Enums\PlanType;
use App\Enums\ReportStatus;
use App\Models\CardVerification;
use App\Models\Plan;
use App\Models\PlanRequest;
use App\Models\Report;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class YenkoStats extends StatsOverviewWidget
{
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        $students = User::where('is_admin', false);
        $active = Plan::active()->where('starts_at', '>', now());
        $byType = fn (PlanType $t) => (clone $active)->where('type', $t)->count();

        return [
            Stat::make('Students', (clone $students)->count())
                ->description((clone $students)->where('is_verified', true)->count().' verified · '
                    .(clone $students)->where('is_suspended', true)->count().' suspended'),
            Stat::make('Active plans', (clone $active)->count())
                ->description($byType(PlanType::Ride).' rides · '.$byType(PlanType::Study).' study · '.$byType(PlanType::Activity).' activities'),
            Stat::make('Join requests (7 days)', PlanRequest::where('created_at', '>=', now()->subDays(7))->count()),
            Stat::make('Cards to review', CardVerification::where('status', CardStatus::Pending)->count())
                ->color('warning'),
            Stat::make('Open reports', Report::where('status', ReportStatus::Open)->count())
                ->color('danger'),
        ];
    }
}
