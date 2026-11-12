<?php

namespace App\Filament\Resources\CardVerifications;

use App\Enums\CardStatus;
use App\Enums\VerificationMethod;
use App\Filament\Resources\CardVerifications\Pages\ListCardVerifications;
use App\Models\CardVerification;
use App\Notifications\YenkoNotification as N;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\Textarea;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use UnitEnum;

class CardVerificationResource extends Resource
{
    protected static ?string $model = CardVerification::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedIdentification;

    protected static string|UnitEnum|null $navigationGroup = 'Community';

    protected static ?int $navigationSort = 2;

    protected static ?string $navigationLabel = 'Student cards';

    public static function getNavigationBadge(): ?string
    {
        $count = CardVerification::where('status', CardStatus::Pending)->count();

        return $count ? (string) $count : null;
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                ImageColumn::make('photo')
                    ->state(fn (CardVerification $record) => route('admin.card-photo', $record))
                    ->imageHeight(90)
                    ->url(fn (CardVerification $record) => route('admin.card-photo', $record), shouldOpenInNewTab: true),
                TextColumn::make('user.name')->searchable()->description(fn (CardVerification $r) => $r->user?->email),
                TextColumn::make('user.student_id')->label('Student ID')->searchable(),
                TextColumn::make('status')->badge()
                    ->formatStateUsing(fn (CardStatus $state) => $state->label())
                    ->color(fn (CardStatus $state) => match ($state) {
                        CardStatus::Pending => 'warning', CardStatus::Approved => 'success', CardStatus::Rejected => 'danger',
                    }),
                TextColumn::make('rejection_reason')->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('created_at')->since()->sortable()->label('Sent'),
            ])
            ->defaultSort('created_at')
            ->filters([
                SelectFilter::make('status')
                    ->options(collect(CardStatus::cases())->mapWithKeys(fn ($s) => [$s->value => $s->label()]))
                    ->default(CardStatus::Pending->value),
            ])
            ->recordActions([
                Action::make('approve')
                    ->icon(Heroicon::OutlinedCheck)
                    ->color('success')
                    ->visible(fn (CardVerification $r) => $r->status === CardStatus::Pending)
                    ->requiresConfirmation()
                    ->modalDescription('Check that the name and student ID on the card match the account.')
                    ->action(function (CardVerification $record) {
                        $record->update(['status' => CardStatus::Approved, 'reviewed_by' => auth()->id(), 'reviewed_at' => now()]);
                        $record->user->markVerified(VerificationMethod::Card);
                        $record->user->notify(new N(N::CARD_APPROVED, "You're verified!", 'Your student card was approved. You can now create and join plans.'));
                        Notification::make()->title('Student verified')->success()->send();
                    }),
                Action::make('reject')
                    ->icon(Heroicon::OutlinedXMark)
                    ->color('danger')
                    ->visible(fn (CardVerification $r) => $r->status === CardStatus::Pending)
                    ->schema([Textarea::make('rejection_reason')->label('Reason (sent to the student)')->required()
                        ->default('The photo is not readable or does not match your account. Please send a clear photo of your student card.')])
                    ->action(function (CardVerification $record, array $data) {
                        $record->update([
                            'status' => CardStatus::Rejected, 'rejection_reason' => $data['rejection_reason'],
                            'reviewed_by' => auth()->id(), 'reviewed_at' => now(),
                        ]);
                        $record->user->notify(new N(N::CARD_REJECTED, 'Student card not approved', $data['rejection_reason']));
                        Notification::make()->title('Card rejected')->success()->send();
                    }),
            ]);
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function getPages(): array
    {
        return ['index' => ListCardVerifications::route('/')];
    }
}
