import type { Routes } from '@angular/router';

import { authGuard, guestGuard, onboardedGuard, startGuard } from './core/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [startGuard], children: [] },

  // Logged out
  { path: 'welcome', canActivate: [guestGuard], loadComponent: () => import('./pages/auth/welcome.page').then((m) => m.WelcomePage) },
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./pages/auth/login.page').then((m) => m.LoginPage) },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./pages/auth/register.page').then((m) => m.RegisterPage) },
  { path: 'forgot-password', canActivate: [guestGuard], loadComponent: () => import('./pages/auth/forgot-password.page').then((m) => m.ForgotPasswordPage) },

  // Onboarding
  { path: 'verify', canActivate: [authGuard], loadComponent: () => import('./pages/auth/verify-email.page').then((m) => m.VerifyEmailPage) },
  { path: 'card-verification', canActivate: [authGuard], loadComponent: () => import('./pages/auth/card-verification.page').then((m) => m.CardVerificationPage) },
  { path: 'complete-profile', canActivate: [authGuard], loadComponent: () => import('./pages/auth/complete-profile.page').then((m) => m.CompleteProfilePage) },

  // Main app
  {
    path: 'tabs',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./pages/main/tabs.page').then((m) => m.TabsPage),
    children: [
      { path: 'explore', loadComponent: () => import('./pages/main/explore.page').then((m) => m.ExplorePage) },
      { path: 'my-plans', loadComponent: () => import('./pages/main/my-plans.page').then((m) => m.MyPlansPage) },
      { path: 'create', loadComponent: () => import('./pages/plans/plan-form.page').then((m) => m.PlanFormPage) },
      { path: 'notifications', loadComponent: () => import('./pages/main/notifications.page').then((m) => m.NotificationsPage) },
      { path: 'profile', loadComponent: () => import('./pages/main/profile.page').then((m) => m.ProfilePage) },
      { path: '', pathMatch: 'full', redirectTo: 'explore' },
    ],
  },
  { path: 'plans/:id', canActivate: [authGuard], loadComponent: () => import('./pages/plans/plan-detail.page').then((m) => m.PlanDetailPage) },
  { path: 'plans/:id/edit', canActivate: [authGuard], loadComponent: () => import('./pages/plans/plan-form.page').then((m) => m.PlanFormPage) },
  { path: 'plans/:id/requests', canActivate: [authGuard], loadComponent: () => import('./pages/plans/manage-requests.page').then((m) => m.ManageRequestsPage) },
  { path: 'profile/edit', canActivate: [authGuard], loadComponent: () => import('./pages/profile/edit-profile.page').then((m) => m.EditProfilePage) },
  { path: 'profile/password', canActivate: [authGuard], loadComponent: () => import('./pages/profile/change-password.page').then((m) => m.ChangePasswordPage) },
  { path: 'safety', canActivate: [authGuard], loadComponent: () => import('./pages/profile/safety.page').then((m) => m.SafetyPage) },

  { path: '**', redirectTo: '' },
];
