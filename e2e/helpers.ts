import { expect, type Page } from '@playwright/test';

let n = 0;
/** A fresh 10-digit mobile number per call (tests create new accounts). */
export const uniquePhone = () => `9${String(Date.now() + n++ * 7919).slice(-6)}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

/** Signs up (or in) through the real OTP screen. Requires OTP_DEV_ECHO on the API. */
export async function signIn(page: Page, phone: string, name?: string) {
  await page.goto('/sign-in');
  await page.getByLabel('Mobile number', { exact: true }).fill(phone);
  if (name) {
    await page.getByLabel(/creating a new account/).check();
    await page.getByLabel(/What should we call you/).fill(name);
    await page.getByLabel(/18 years/).check();
    await page.getByLabel(/accept the Terms/).check();
  }
  await page.getByRole('button', { name: 'Send code' }).click();
  const hint = await page.getByText(/Test mode code: \d{6}/).textContent();
  await page.getByLabel(/Enter the 6-digit code/).last().fill(hint!.match(/\d{6}/)![0]);
  await page.getByRole('button', { name: /Verify and continue/ }).click();
  await expect(page).toHaveURL(/\/$/);
}

/** Collects uncaught page errors and failed API calls (except expected 4xx probes). */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('response', (r) => {
    if (r.url().includes('/api/v1/') && r.status() >= 500) errors.push(`${r.status()} ${r.request().method()} ${r.url()}`);
    if (r.url().includes('/api/v1/') && r.status() === 400) r.text().then((t) => errors.push(`400 ${r.request().method()} ${r.url()} ${t}`)).catch(() => {});
  });
  return errors;
}
