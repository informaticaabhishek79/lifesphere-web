import { expect, test } from '@playwright/test';
import { signIn, uniquePhone, watchErrors } from './helpers';

const PAGES = [
  '/',
  '/tasks',
  '/reminders',
  '/calendar',
  '/households',
  '/lists',
  '/inventory',
  '/budgets',
  '/contacts',
  '/sharing',
  '/check-ins',
  '/help',
  '/community',
  '/civic',
  '/services',
  '/service-requests',
  '/consumer',
  '/assistant',
  '/knowledge',
  '/provider-portal',
  '/notifications',
  '/settings',
  '/privacy',
];

test('every page loads without errors, in English and Hindi', async ({ page }) => {
  const errors = watchErrors(page);
  await signIn(page, uniquePhone(), 'Crawl Tester');
  for (const lang of ['en', 'hi']) {
    if (lang === 'hi') await page.getByRole('button', { name: /भाषा|Language/ }).first().click();
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main h1').first()).toBeVisible();
      await expect(page.getByText(/Something went wrong|कुछ गड़बड़ हो गई/)).toHaveCount(0);
    }
  }
  expect(errors).toEqual([]);
});

test('pages with sample data, including detail pages', async ({ page }) => {
  test.skip(!process.env.DEMO_PHONE, 'Run scripts/demo-data.mjs and set DEMO_PHONE=+919810000002 to include this check.');
  const errors = watchErrors(page);
  await signIn(page, process.env.DEMO_PHONE!);
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Something went wrong/)).toHaveCount(0);
    // open the first detail link on list pages
    const detail = page.locator(`main a[href^="${path}/"]`).first();
    if (path !== '/' && (await detail.count())) {
      await detail.click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/Something went wrong/)).toHaveCount(0);
    }
  }
  expect(errors).toEqual([]);
});

test('public pages', async ({ page }) => {
  await page.goto('/privacy-notice');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goto('/invite/contact#not-a-real-token');
  await expect(page.getByRole('link', { name: /Sign in to continue/ })).toBeVisible();
});
