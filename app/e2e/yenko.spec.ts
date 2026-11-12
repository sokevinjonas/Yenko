import { expect, test, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * End-to-end walk through the main flows against a real backend.
 * Needs: backend on :8010 with fresh demo data
 *   (cd ../backend && php artisan migrate:fresh --seed && php artisan db:seed --class=DemoSeeder && php artisan serve --port=8010)
 */
test.describe.configure({ mode: 'serial' });

const LOG = resolve(__dirname, '../../backend/storage/logs/laravel.log');
const shot = (page: Page, name: string) => page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: false });
const stamp = Date.now().toString().slice(-6);

function lastCode(): string {
  const matches = [...readFileSync(LOG, 'utf8').matchAll(/letter-spacing:8px[^>]*>(\d{6})</g)];
  return matches[matches.length - 1][1];
}

async function login(page: Page, id: string) {
  await page.goto('/login');
  await page.getByLabel('Student ID or email').fill(id);
  await page.getByLabel('Password', { exact: true }).fill('password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/tabs\/explore/);
}

test('welcome screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Share your ride,')).toBeVisible();
  await shot(page, '01-welcome');
});

test('register, verify email, complete profile', async ({ page }) => {
  writeFileSync(LOG, '');
  await page.goto('/register');
  await page.getByLabel('Student ID').fill(`10${stamp}`);
  await page.getByLabel('Full name').fill('Yaw Boateng');
  await page.getByLabel('Student email').fill(`yaw${stamp}@st.ug.edu.gh`);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByLabel('Confirm password').fill('secret123');
  await shot(page, '02-register');
  await page.getByRole('button', { name: 'Create my account' }).click();

  await expect(page).toHaveURL(/verify/);
  await expect(page.getByText('Check your student email')).toBeVisible();
  await shot(page, '03-verify');
  await page.getByLabel('Verification code').fill(lastCode());
  await page.getByRole('button', { name: 'Verify' }).click();

  await expect(page).toHaveURL(/complete-profile/);
  await page.locator('ion-select[name=hall]').click();
  await page.getByRole('radio', { name: 'Akuafo Hall' }).click();
  await page.getByLabel('WhatsApp number').fill('024 555 1234');
  await page.locator('ion-segment-button[value=male]').click();
  await shot(page, '04-complete-profile');
  await page.getByRole('button', { name: /Let's go/ }).click();

  await expect(page).toHaveURL(/tabs\/explore/);
  await expect(page.getByText('Where you dey go today?')).toBeVisible();
  await expect(page.getByText('Legon → Kotoka Airport')).toBeVisible();
  await shot(page, '05-explore');
});

test('join an auto-accept plan and see the WhatsApp contact', async ({ page }) => {
  await login(page, '10900003');
  await page.getByText('Friday chill at Accra Mall').click();
  await expect(page.getByRole('button', { name: 'Join now' })).toBeVisible();
  await shot(page, '06-plan-detail');
  await page.getByRole('button', { name: 'Join now' }).click();
  await expect(page.getByText("You're in!", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Chat with Kofi/ })).toBeVisible();
  await shot(page, '07-joined');
});

test('women-only plan is blocked for men', async ({ page }) => {
  await login(page, '10900001');
  await page.getByText('Legon → Kotoka Airport').click();
  await expect(page.getByText('This plan is for women only.')).toBeVisible();
});

test('create a ride', async ({ page }) => {
  await login(page, '10900001');
  await page.goto('/tabs/create');
  await page.getByLabel('Title').fill('Bolt to Osu tonight');
  await page.locator('ion-select[name=destination]').click();
  await page.getByRole('radio', { name: 'Osu', exact: true }).click();
  await page.getByLabel('Meeting point').fill('Commonwealth Hall gate');
  await page.getByLabel(/Price per person/).fill('20');
  await shot(page, '08-create');
  await page.getByRole('button', { name: /Post my plan/ }).click();
  await expect(page).toHaveURL(/plans\/\d+$/);
  await expect(page.getByRole('heading', { name: 'Bolt to Osu tonight' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Manage requests' })).toBeVisible();
  await shot(page, '09-my-plan');
});

test('organiser accepts a request', async ({ page }) => {
  await login(page, '10900003');
  await page.goto('/tabs/my-plans');
  await page.getByText('UGBS 201 — Exam prep').click();
  await page.getByRole('link', { name: /Manage requests/ }).click();
  await expect(page.getByText('Waiting for you (1)')).toBeVisible();
  await shot(page, '10-requests');
  await page.getByRole('button', { name: 'Accept' }).click();
  await expect(page.getByText('Members (2)')).toBeVisible();
});

test('notifications and profile', async ({ page }) => {
  await login(page, '10900001');
  await page.goto('/tabs/notifications');
  await expect(page.getByText('New member')).toBeVisible();
  await shot(page, '11-notifications');
  await page.goto('/tabs/profile');
  await expect(page.getByText('Verified student')).toBeVisible();
  await shot(page, '12-profile');
  await page.goto('/tabs/my-plans');
  await expect(page.getByText('Bolt to Osu tonight')).toBeVisible();
  await shot(page, '13-my-plans');
});
