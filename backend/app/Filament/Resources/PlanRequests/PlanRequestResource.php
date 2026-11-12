<?php

namespace App\Filament\Resources\PlanRequests;

use App\Enums\RequestStatus;
use App\Filament\Resources\PlanRequests\Pages\ListPlanRequests;
use App\Models\PlanRequest;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use UnitEnum;

/** Read-only view of join requests. */
class PlanRequestResource extends Resource
{
    protected static ?string $model = PlanRequest::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedHandRaised;

    protected static string|UnitEnum|null $navigationGroup = 'Activity';

    protected static ?int $navigationSort = 6;

    protected static ?string $navigationLabel = 'Join requests';

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('plan.title')->label('Plan')->searchable()->limit(40),
                TextColumn::make('user.name')->label('Student')->searchable(),
                TextColumn::make('status')->badge()
                    ->formatStateUsing(fn (RequestStatus $state) => $state->label())
                    ->color(fn (RequestStatus $state) => match ($state) {
                        RequestStatus::Pending => 'warning', RequestStatus::Accepted => 'success',
                        RequestStatus::Rejected, RequestStatus::Removed => 'danger', default => 'gray',
                    }),
                TextColumn::make('message')->limit(50)->toggleable(),
                TextColumn::make('created_at')->since()->sortable()->label('Sent'),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                SelectFilter::make('status')->options(collect(RequestStatus::cases())->mapWithKeys(fn ($s) => [$s->value => $s->label()])),
            ]);
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function getPages(): array
    {
        return ['index' => ListPlanRequests::route('/')];
    }
}
