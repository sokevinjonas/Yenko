import { inject } from '@angular/core';
import type { CanActivateFn} from '@angular/router';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';

// inject() must run before any await: grab services first.

/** Logged-in users only. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.init();
  return auth.isLoggedIn() ? true : router.parseUrl('/welcome');
};

/** Logged-out users only (welcome, login, register…). */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.init();
  return auth.isLoggedIn() ? router.parseUrl(auth.nextRoute()) : true;
};

/** Main app: send users who are still onboarding to the right step. */
export const onboardedGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.init();
  if (!auth.isLoggedIn()) {
    return router.parseUrl('/welcome');
  }
  const next = auth.nextRoute();
  return next === '/tabs/explore' ? true : router.parseUrl(next);
};

/** Entry point: redirect to the right screen. */
export const startGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.init();
  return router.parseUrl(auth.nextRoute());
};
