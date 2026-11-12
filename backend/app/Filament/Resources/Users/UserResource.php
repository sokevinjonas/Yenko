<?php

namespace App\Filament\Resources\Users;

use App\Enums\Gender;
use App\Enums\VerificationMethod;
use App\Filament\Resources\Users\Pages\EditUser;
use App\Filament\Resources\Users\Pages\ListUsers;
use App\Models\User;
use App\Services\ReportService;
use App\Support\Phone;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Actions\ActionGroup;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use UnitEnum;

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedUsers;

    protected static string|UnitEnum|null $navigationGroup = 'Community';

    protected static ?int $navigationSort = 1;

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')->required()->maxLength(60),
            TextInput::make('student_id')->disabled(),
            TextInput::make('email')->disabled(),
            Select::make('hall_id')->relationship('hall', 'name')->searchable()->preload(),
            TextInput::make('whatsapp')
                ->helperText('Ghana number, e.g. 0241234567')
                ->dehydrateStateUsing(fn (?string $state) => Phone::normalize($state) ?? $state),
            Select::make('gender')->options(collect(Gender::cases())->mapWithKeys(fn ($g) => [$g->value => $g->label()])),
            Textarea::make('bio')->maxLength(160),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                ImageColumn::make('avatar_path')->disk('public')->circular()->label(''),
                TextColumn::make('name')->searchable()->sortable(),
                TextColumn::make('student_id')->searchable()->label('Student ID'),
                TextColumn::make('email')->searchable()->toggleable(),
                TextColumn::make('hall.name')->toggleable(),
                TextColumn::make('whatsapp')->toggleable(isToggledHiddenByDefault: true),
                IconColumn::make('is_verified')->boolean()->label('Verified'),
                IconColumn::make('is_suspended')->boolean()->label('Suspended')
                    ->trueColor('danger')->falseColor('gray'),
                IconColumn::make('is_admin')->boolean()->label('Admin')->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('reports_received_count')->counts('reportsReceived')->label('Reports'),
                TextColumn::make('created_at')->dateTime()->sortable()->label('Joined'),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                TernaryFilter::make('is_verified')->label('Verified'),
                TernaryFilter::make('is_suspended')->label('Suspended'),
                TernaryFilter::make('is_admin')->label('Admin'),
            ])
            ->recordActions([
                EditAction::make(),
                ActionGroup::make([
                    Action::make('verify')
                        ->icon(Heroicon::OutlinedCheckBadge)
                        ->color('success')
                        ->visible(fn (User $record) => ! $record->is_verified)
                        ->requiresConfirmation()
                        ->action(function (User $record) {
                            $record->markVerified(VerificationMethod::Card);
                            Notification::make()->title('Student verified')->success()->send();
                        }),
                    Action::make('suspend')
                        ->icon(Heroicon::OutlinedNoSymbol)
                        ->color('danger')
                        ->visible(fn (User $record) => ! $record->is_suspended && ! $record->is_admin)
                        ->schema([Textarea::make('reason')->required()->default('Your account was suspended by the Yenko team.')])
                        ->action(function (User $record, array $data) {
                            app(ReportService::class)->suspend($record, $data['reason']);
                            Notification::make()->title('User suspended')->success()->send();
                        }),
                    Action::make('unsuspend')
                        ->icon(Heroicon::OutlinedArrowPath)
                        ->color('success')
                        ->visible(fn (User $record) => $record->is_suspended)
                        ->requiresConfirmation()
                        ->action(function (User $record) {
                            $record->unsuspend();
                            Notification::make()->title('User reactivated')->success()->send();
                        }),
                    Action::make('toggleAdmin')
                        ->label(fn (User $record) => $record->is_admin ? 'Remove admin' : 'Make admin')
                        ->icon(Heroicon::OutlinedShieldCheck)
                        ->visible(fn (User $record) => $record->id !== auth()->id())
                        ->requiresConfirmation()
                        ->action(fn (User $record) => $record->forceFill(['is_admin' => ! $record->is_admin])->save()),
                ]),
            ]);
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with('hall');
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function getPages(): array
    {
        return [
            'index' => ListUsers::route('/'),
            'edit' => EditUser::route('/{record}/edit'),
        ];
    }
}
