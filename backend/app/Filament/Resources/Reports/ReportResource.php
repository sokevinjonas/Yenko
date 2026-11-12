<?php

namespace App\Filament\Resources\Reports;

use App\Enums\ReportReason;
use App\Enums\ReportStatus;
use App\Filament\Resources\Reports\Pages\ListReports;
use App\Filament\Resources\Users\UserResource;
use App\Models\Report;
use App\Services\ReportService;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Actions\ActionGroup;
use Filament\Forms\Components\Textarea;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use UnitEnum;

class ReportResource extends Resource
{
    protected static ?string $model = Report::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedFlag;

    protected static string|UnitEnum|null $navigationGroup = 'Community';

    protected static ?int $navigationSort = 3;

    public static function getNavigationBadge(): ?string
    {
        $count = Report::where('status', ReportStatus::Open)->count();

        return $count ? (string) $count : null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'danger';
    }

    public static function table(Table $table): Table
    {
        $close = fn (ReportStatus $status) => function (Report $record) use ($status) {
            $record->update(['status' => $status, 'resolved_by' => auth()->id(), 'resolved_at' => now()]);
            Notification::make()->title('Report '.$status->value)->success()->send();
        };

        return $table
            ->columns([
                TextColumn::make('reportedUser.name')->label('Reported')->searchable()
                    ->url(fn (Report $r) => UserResource::getUrl('edit', ['record' => $r->reported_user_id]))
                    ->description(fn (Report $r) => $r->reportedUser?->is_suspended ? 'Suspended' : null),
                TextColumn::make('reason')->badge()->formatStateUsing(fn (ReportReason $state) => $state->label()),
                TextColumn::make('details')->limit(60)->wrap(),
                TextColumn::make('reporter.name')->label('By')->searchable(),
                TextColumn::make('plan.title')->label('Plan')->limit(30)->toggleable(),
                TextColumn::make('status')->badge()
                    ->formatStateUsing(fn (ReportStatus $state) => $state->label())
                    ->color(fn (ReportStatus $state) => match ($state) {
                        ReportStatus::Open => 'danger', ReportStatus::Resolved => 'success', ReportStatus::Dismissed => 'gray',
                    }),
                TextColumn::make('created_at')->since()->sortable()->label('Sent'),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                SelectFilter::make('status')
                    ->options(collect(ReportStatus::cases())->mapWithKeys(fn ($s) => [$s->value => $s->label()]))
                    ->default(ReportStatus::Open->value),
                SelectFilter::make('reason')->options(collect(ReportReason::cases())->mapWithKeys(fn ($s) => [$s->value => $s->label()])),
            ])
            ->recordActions([
                ActionGroup::make([
                    Action::make('resolve')->icon(Heroicon::OutlinedCheck)->color('success')
                        ->visible(fn (Report $r) => $r->status === ReportStatus::Open)
                        ->action($close(ReportStatus::Resolved)),
                    Action::make('dismiss')->icon(Heroicon::OutlinedXMark)
                        ->visible(fn (Report $r) => $r->status === ReportStatus::Open)
                        ->action($close(ReportStatus::Dismissed)),
                    Action::make('suspendUser')->label('Suspend user')->icon(Heroicon::OutlinedNoSymbol)->color('danger')
                        ->visible(fn (Report $r) => ! $r->reportedUser?->is_suspended)
                        ->schema([Textarea::make('reason')->required()->default('Your account was suspended after reports from other students.')])
                        ->action(function (Report $record, array $data) {
                            app(ReportService::class)->suspend($record->reportedUser, $data['reason']);
                            Notification::make()->title('User suspended')->success()->send();
                        }),
                ]),
            ]);
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function getPages(): array
    {
        return ['index' => ListReports::route('/')];
    }
}
