import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';

const PAGES: [string, string][] = [
  ['/legal', 'Policies'],
  ['/legal/terms', 'Terms of Service'],
  ['/legal/privacy', 'Privacy Policy'],
  ['/legal/refund-policy', 'Refund Policy'],
  ['/legal/medical-disclaimer', 'Medical Disclaimer'],
  ['/legal/child-safety', 'Child Safety'],
  ['/legal/account-termination', 'Account Termination'],
  ['/legal/acceptable-use', 'Acceptable Use Policy'],
  ['/legal/grievance', 'Grievance Officer'],
  ['/legal/contact', 'Contact Us'],
];

test('every policy page is public and shows the grievance officer', async ({ page }) => {
  const errors = watchErrors(page);
  for (const [path, heading] of PAGES) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.locator('footer')).toContainText('Deemona Global Solutions');
    await expect(page.locator('footer')).toContainText('+91 96541 35922');
  }
  await page.goto('/legal/grievance');
  await expect(page.getByText('Abhishek', { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('sign-up links to the Terms and the Privacy Policy, and the footer lists the policies', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel(/creating a new account/i).check();
  await expect(page.getByRole('link', { name: 'Read the Terms of Service' })).toHaveAttribute('href', '/legal/terms');
  await expect(page.getByRole('link', { name: 'Read the Privacy Notice' })).toHaveAttribute('href', '/legal/privacy');
  await page.getByRole('navigation', { name: 'All policies' }).getByRole('link', { name: 'All policies' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Policies' })).toBeVisible();
  await page.getByRole('link', { name: /Medical Disclaimer/ }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Medical Disclaimer' })).toBeVisible();
});

test('search engines may index the policies, but not the rest of the app', async ({ page, request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Allow: /legal');
  expect(robots).toContain('Disallow: /');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const [path] of PAGES) expect(sitemap).toContain(`${path}</loc>`);
  await page.goto('/legal/privacy');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
  await page.goto('/sign-in');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});
