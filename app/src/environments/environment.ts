export const environment = {
  production: false,
  /** Laravel API (php artisan serve --port=8010). */
  apiUrl: 'http://localhost:8010/api/v1',
  /** Turn on once a Firebase project is configured (google-services.json + FIREBASE_CREDENTIALS on the backend). */
  pushEnabled: false,
  /** Public web address of the app, used in shared plan links from the native app. */
  publicUrl: 'https://yenko.app',
};
