# Yenko

> *Yɛnkɔ* — "let's go!" in Twi. Share your ride, find your squad.

App for University of Ghana (Legon) students: split taxis/Bolts, find study groups and activities.
Full specification: [SPEC.md](SPEC.md).

```text
Yenko/
├── backend/   Laravel 13 API (Sanctum) + Filament admin panel, SQLite, Pest tests
└── app/       Ionic 9 + Angular (standalone, signals), PWA, Capacitor configured
```

## Requirements

PHP 8.4 (gd, sqlite3), Composer, Node 22, npm.

## Backend

```bash
cd backend
composer install
cp .env.example .env && php artisan key:generate   # first time only
touch database/database.sqlite
php artisan migrate --seed                          # halls + destinations
php artisan db:seed --class=DemoSeeder              # optional demo data (password: "password")
php artisan storage:link
php artisan yenko:admin admin@yenko.app             # create an admin for /admin
php artisan serve --port=8010
```

- API: `http://localhost:8010/api/v1`
- Admin panel: `http://localhost:8010/admin`
- Scheduler (reminders, closing past plans): `php artisan schedule:work` in dev, a cron calling
  `php artisan schedule:run` every minute in production.
- Emails: in dev they go to `storage/logs/laravel.log` (`MAIL_MAILER=log`). For real emails set the
  SMTP variables (Brevo, Resend…) in `.env`.
- Tests: `./vendor/bin/pest` · code style: `./vendor/bin/pint`

Demo accounts (after `DemoSeeder`): student IDs `10900001` (Kofi), `10900002` (Ama), `10900003` (Kwame), password `password`.

> Port 8000 is taken on this machine, so the project uses **8010**. If you change it, update
> `APP_URL` in `backend/.env` and `apiUrl` in `app/src/environments/environment.ts`.

### Useful settings (`backend/.env`)

| Variable | Purpose |
|---|---|
| `YENKO_EMAIL_DOMAIN` | Allowed student email domain (default `st.ug.edu.gh`) |
| `CORS_ALLOWED_ORIGINS` | Origins allowed to call the API (the app's URLs) |
| `FIREBASE_CREDENTIALS` | Path to a Firebase service-account JSON — empty = push disabled |
| `YENKO_AUTH_PER_MINUTE` | Login/register/reset attempts per minute per IP + account (keep **5** in production) |
| `YENKO_API_PER_MINUTE` | API requests per minute per user (default 120) |

Business limits (seats, active plans, code expiry, auto-suspension threshold…) live in `backend/config/yenko.php`.

## App

```bash
cd app
npm install
npm start            # http://localhost:4200 (or `ionic serve` → :8100)
npm run build        # production build in www/ (PWA)
npx eslint src       # lint
```

End-to-end tests — 16 flows on a mobile viewport with a French browser locale (the app must stay in English).
The backend must run on :8010 with fresh demo data and high rate limits (`YENKO_AUTH_PER_MINUTE=1000` in `.env`):

```bash
cd backend && php artisan migrate:fresh --seed && php artisan db:seed --class=DemoSeeder && php artisan serve --port=8010
cd app && npx playwright test        # screenshots in e2e/screenshots/
# reuse an already downloaded Chromium: YK_CHROME=~/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome npx playwright test
```

Before a production build, set `apiUrl` in `app/src/environments/environment.prod.ts`.

### Android (later)

Capacitor is configured (`com.yenko.app`). Once the Android SDK is installed:

```bash
cd app
npm install @capacitor/android
npx cap add android
npm run build && npx cap sync android
npx cap open android
```

To check on a real phone once Android is added: WhatsApp buttons open WhatsApp (App Launcher plugin),
green status bar, hardware back button, keyboard not hiding form fields, photo upload from the camera.

### Push notifications (later)

Everything is wired but off. To turn it on:
1. Create a Firebase project, add the Android app `com.yenko.app`, put `google-services.json` in `app/android/app/`.
2. Download a service-account key and set `FIREBASE_CREDENTIALS=/path/to/key.json` in `backend/.env`.
3. Set `pushEnabled: true` in the app environments and rebuild.

Until then, notifications are stored and shown in the app (Alerts tab, refreshed every 60 s).
