import { expect, test, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * End-to-end walk through the main flows against a real backend.
 * Needs: backend on :8010 with fresh demo data
 *   (cd ../backend && php artisan migrate:fresh --seed && php artisan db:seed --class=DemoSeeder && php artisan serve --port=8010)
 */
test.describe.configure({ mode: 'serial' });
// French browser on purpose: the app must stay in English (dates included).
test.use({ locale: 'fr-FR' });

const LOG = resolve(__dirname, '../../backend/storage/logs/laravel.log');
const shot = (page: Page, name: string) => page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: false });
const stamp = Date.now().toString().slice(-6);
const yawEmail = `yaw${stamp}@st.ug.edu.gh`;
const FIXTURE = resolve(__dirname, '../public/icons/icon-512x512.png');

function lastCode(): string {
  const matches = [...readFileSync(LOG, 'utf8').matchAll(/letter-spacing:8px[^>]*>(\d{6})</g)];
  return matches[matches.length - 1][1];
}

async function login(page: Page, id: string, password = 'password') {
  await page.goto('/login');
  await page.getByLabel('Student ID or email').fill(id);
  await page.getByLabel('Password', { exact: true }).fill(password);
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
  await page.getByLabel('Student email').fill(yawEmail);
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

test('dates stay in English and the organiser can edit a plan', async ({ page }) => {
  await login(page, '10900001');
  await page.goto('/tabs/create');
  await expect(page.locator('ion-datetime-button')).toContainText(/\d{1,2} [A-Z][a-z]{2} \d{4}/);
  await page.goto('/tabs/my-plans');
  await page.getByText('Bolt to Osu tonight').click();
  await page.getByRole('link', { name: 'Edit plan' }).click();
  await expect(page.getByLabel('Title')).toHaveValue('Bolt to Osu tonight');
  await page.getByLabel('Title').fill('Bolt to Osu — 2 seats');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Bolt to Osu — 2 seats' })).toBeVisible();
});

test('share a plan (WhatsApp fallback on desktop browsers)', async ({ page }) => {
  await login(page, '10900001');
  await page.goto('/tabs/my-plans');
  await page.getByText('Bolt to Osu — 2 seats').click();
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Share this plan' }).click();
  const shared = await popup;
  const url = decodeURIComponent(shared.url().replace(/\+/g, ' '));
  expect(url).toContain('whatsapp');
  expect(url).toContain('Bolt to Osu — 2 seats');
  expect(url).toMatch(/\/plans\/\d+/);
});

test('ask to join, then cancel the request', async ({ page }) => {
  await login(page, '10900001');
  await page.getByText('Bolt to Madina market').click();
  await page.getByRole('button', { name: 'Ask to join' }).click();
  await page.locator('ion-alert textarea').fill('I have one small bag');
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByText('Request sent').first()).toBeVisible();
  await page.getByRole('button', { name: 'Cancel my request' }).click();
  await page.getByRole('button', { name: 'Cancel request' }).click();
  await expect(page.getByRole('button', { name: 'Ask to join' })).toBeVisible();
});

test('a member leaves a plan', async ({ page }) => {
  await login(page, '10900003');
  await page.getByText('Friday chill at Accra Mall').click();
  await page.getByRole('button', { name: 'Leave this plan' }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Join now' })).toBeVisible();
});

test('report the organiser of a plan', async ({ page }) => {
  await login(page, '10900001');
  await page.getByText('Legon → Kotoka Airport').click();
  await page.getByRole('button', { name: 'Report the organiser' }).click();
  await page.getByRole('button', { name: 'Wrong WhatsApp number' }).click();
  await page.locator('ion-alert textarea').fill('The number does not exist');
  await page.getByRole('button', { name: 'Send report' }).click();
  await expect(page.getByText('Thanks. Our team will look into it.')).toBeVisible();
});

test('offline: banner, cached plans and retry state', async ({ page, context }) => {
  await login(page, '10900001');
  await expect(page.getByText('Legon → Kotoka Airport')).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByText("You're offline")).toBeVisible();
  await page.getByRole('button', { name: 'Study' }).click();
  await expect(page.getByText('Network dey play.').first()).toBeVisible();
  await shot(page, '14-offline');
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect(page.getByText('Legon → Kotoka Airport')).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText("You're offline")).toBeHidden();
});

test('verify with a student card instead of the email', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Student ID').fill(`11${stamp}`);
  await page.getByLabel('Full name').fill('Akosua Darko');
  await page.getByLabel('Student email').fill(`akosua${stamp}@st.ug.edu.gh`);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByLabel('Confirm password').fill('secret123');
  await page.getByRole('button', { name: 'Create my account' }).click();
  await expect(page).toHaveURL(/verify/);
  await page.getByRole('link', { name: 'Use my student card' }).click();
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  await page.getByRole('button', { name: 'Send for review' }).click();
  await expect(page.getByText('We got your card')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/complete-profile/);
  await page.locator('ion-select[name=hall]').click();
  await page.getByRole('radio', { name: 'Volta Hall' }).click();
  await page.getByLabel('WhatsApp number').fill('0207771234');
  await page.locator('ion-segment-button[value=female]').click();
  await page.getByRole('button', { name: /Let's go/ }).click();
  await expect(page).toHaveURL(/tabs\/explore/);
  await expect(page.getByText('Student card under review')).toBeVisible();
});

test('forgot password, then delete the account', async ({ page }) => {
  writeFileSync(LOG, '');
  await page.goto('/forgot-password');
  await page.getByLabel('Student email').fill(yawEmail);
  await page.getByRole('button', { name: 'Send code' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await page.getByLabel('Code').fill(lastCode());
  await page.getByLabel('New password', { exact: true }).fill('newpass123');
  await page.getByLabel('Confirm new password').fill('newpass123');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page).toHaveURL(/login/);

  await login(page, yawEmail, 'newpass123');
  await page.goto('/tabs/profile');
  await page.getByRole('button', { name: 'Delete my account' }).click();
  await page.locator('ion-alert input').fill('newpass123');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page).toHaveURL(/welcome/);
});

test.describe('dark mode', () => {
  test.use({ colorScheme: 'dark' });
  test('screens render in dark mode', async ({ page }) => {
    await login(page, '10900001');
    await expect(page.getByText('Legon → Kotoka Airport')).toBeVisible();
    await shot(page, '20-dark-explore');
    await page.getByText('UGBS 201 — Exam prep').click();
    await expect(page.getByRole('heading', { name: 'UGBS 201 — Exam prep' })).toBeVisible();
    await shot(page, '21-dark-detail');
    await page.goto('/tabs/create');
    await expect(page.getByText("What's the plan?")).toBeVisible();
    await shot(page, '22-dark-create');
  });
});
