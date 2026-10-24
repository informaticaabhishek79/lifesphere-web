import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';

const PAGES: [string, string][] = [
  ['/guide', 'How to Use LifeSphere'],
  ['/guide/getting-started', 'Getting Started'],
  ['/guide/my-day', 'My Day: Tasks, Reminders & Calendar'],
  ['/guide/home', 'Home: Households, Lists, Inventory & Budget'],
  ['/guide/family-care', 'Family Care: Check-ins, Contacts & Help'],
  ['/guide/community', 'Community & Civic Issues'],
  ['/guide/help-and-services', 'Local Services & Consumer Help'],
  ['/guide/assistants', 'Voice Assistant, Agents, Email & Smart Inbox'],
  ['/guide/documents', 'Documents & the Smart Inbox'],
  ['/guide/settings-and-privacy', 'Settings, Privacy & Your Data'],
  ['/guide/mobile-and-offline', 'Install on Your Phone'],
];

test('every guide page is public and loads without errors', async ({ page }) => {
  const errors = watchErrors(page);
  for (const [path, heading] of PAGES) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('the guide is cross-linked from sign-in, legal and the app privacy page', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('link', { name: 'How to use LifeSphere' })).toHaveAttribute('href', '/guide');

  await page.goto('/legal');
  await expect(page.getByRole('link', { name: /how to use it/i })).toHaveAttribute('href', '/guide');

  await page.goto('/guide');
  await expect(page.getByRole('link', { name: 'All topics' }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Family Care: Check-ins, Contacts & Help' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Family Care: Check-ins, Contacts & Help' })).toBeVisible();
});

test('search engines may index the guide, and it is listed in the sitemap', async ({ page, request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Allow: /guide');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const [path] of PAGES) expect(sitemap).toContain(`${path}</loc>`);
  await page.goto('/guide/documents');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
});
