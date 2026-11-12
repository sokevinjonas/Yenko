<?php

namespace App\Filament\Resources\Plans;

use App\Enums\PlanStatus;
use App\Enums\PlanType;
use App\Filament\Resources\Plans\Pages\ListPlans;
use App\Models\Plan;
use App\Services\PlanService;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ToggleColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use UnitEnum;

class PlanResource extends Resource
{
    protected static ?string $model = Plan::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedCalendarDays;

    protected static string|UnitEnum|null $navigationGroup = 'Activity';

    protected static ?int $navigationSort = 5;

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('title')->searchable()->limit(40)
                    ->description(fn (Plan $r) => $r->destination?->name ?? $r->course ?? $r->category?->label()),
                TextColumn::make('type')->badge()
                    ->formatStateUsing(fn (PlanType $state) => $state->label())
                    ->color(fn (PlanType $state) => match ($state) {
                        PlanType::Ride => 'warning', PlanType::Study => 'info', PlanType::Activity => 'success',
                    }),
                TextColumn::make('user.name')->label('Organiser')->searchable(),
                TextColumn::make('starts_at')->dateTime('D d M, H:i')->sortable(),
                TextColumn::make('seats')
                    ->state(fn (Plan $r) => $r->accepted_requests_count.' / '.$r->seats_total),
                TextColumn::make('status')->badge()
                    ->formatStateUsing(fn (PlanStatus $state) => $state->label())
                    ->color(fn (PlanStatus $state) => match ($state) {
                        PlanStatus::Open => 'success', PlanStatus::Full => 'warning',
                        PlanStatus::Cancelled => 'danger', PlanStatus::Done => 'gray',
                    }),
                TextColumn::make('women_only')->label('Women only')->badge()
                    ->formatStateUsing(fn (bool $state) => $state ? 'Yes' : '')->color('danger')
                    ->toggleable(isToggledHiddenByDefault: true),
                ToggleColumn::make('is_boosted')->label('Boost'),
            ])
            ->defaultSort('starts_at', 'desc')
            ->filters([
                SelectFilter::make('type')->options(collect(PlanType::cases())->mapWithKeys(fn ($t) => [$t->value => $t->label()])),
                SelectFilter::make('status')->options(collect(PlanStatus::cases())->mapWithKeys(fn ($s) => [$s->value => $s->label()])),
            ])
            ->recordActions([
                Action::make('cancel')
                    ->icon(Heroicon::OutlinedXCircle)
                    ->color('danger')
                    ->visible(fn (Plan $r) => $r->isActive())
                    ->requiresConfirmation()
                    ->modalDescription('Members and pending requesters will be notified.')
                    ->action(function (Plan $record) {
                        app(PlanService::class)->cancel($record, byAdmin: true);
                        Notification::make()->title('Plan cancelled')->success()->send();
                    }),
            ]);
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with(['user', 'destination'])->withCount('acceptedRequests');
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function getPages(): array
    {
        return ['index' => ListPlans::route('/')];
    }
}
