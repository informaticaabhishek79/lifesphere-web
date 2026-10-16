import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';

import { createHmac } from 'node:crypto';

/** Authenticator (TOTP, RFC 6238) code for a base32 secret: SHA-1, 6 digits, 30-second steps. */
const authenticator = {
  generate(secret: string) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const c of secret.replace(/=+$/, '').toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
    const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
    const h = createHmac('sha1', key).update(counter).digest();
    const o = h[h.length - 1] & 0xf;
    return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, '0');
  },
};

const API = (process.env.API_URL ?? 'http://localhost:4000') + '/v1';
const ADMIN = process.env.ADMIN_PHONE ?? '+919999900001';

async function api(path: string, body?: unknown, token?: string) {
  const r = await fetch(API + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${path} ${r.status} ${t}`);
  return t ? JSON.parse(t) : null;
}

/** Ensures the seeded admin (npm run db:seed -- --admin=+91…) has an authenticator set up; returns its secret. */
async function ensureAdminTotp(): Promise<string | null> {
  const c = await api('/auth/otp/request', { channel: 'sms', destination: ADMIN });
  const v = await api('/auth/otp/verify', { challengeId: c.challengeId, code: c.devCode });
  if (v.status === 'mfa_required') return process.env.ADMIN_TOTP_SECRET ?? null;
  const tok = v.accessToken;
  const r = await api('/auth/reauth/request', { channel: 'sms' }, tok);
  await api('/auth/reauth/verify', { challengeId: r.challengeId, code: r.devCode }, tok);
  const setup = await api('/auth/mfa/totp/setup', {}, tok);
  await api('/auth/mfa/totp/confirm', { code: authenticator.generate(setup.secret) }, tok);
  return setup.secret;
}

test('staff console with two-step sign-in', async ({ page }) => {
  const secret = await ensureAdminTotp();
  test.skip(!secret, 'Admin already has two-step verification; set ADMIN_TOTP_SECRET to run this test.');
  const errors = watchErrors(page);
  await page.goto('/sign-in');
  await page.getByLabel('Mobile number', { exact: true }).fill(ADMIN.replace('+91', ''));
  await page.getByRole('button', { name: 'Send code' }).click();
  const hint = await page.getByText(/Test mode code: \d{6}/).textContent();
  await page.getByLabel(/Enter the 6-digit code/).last().fill(hint!.match(/\d{6}/)![0]);
  await page.getByRole('button', { name: /Verify and continue/ }).click();
  // A code can be used only once; wait for the next 30-second window after setup.
  await page.waitForTimeout((30 - ((Date.now() / 1000) % 30)) * 1000 + 1500);
  await page.getByLabel('Authenticator code').fill(authenticator.generate(secret!));
  await page.getByRole('button', { name: /Verify and continue/ }).click();
  await expect(page).toHaveURL(/\/$/);
  for (const path of ['/admin', '/admin/users', '/admin/moderation', '/admin/providers', '/admin/privacy', '/admin/catalogue', '/admin/knowledge', '/admin/assistant', '/admin/notifications', '/admin/staff', '/admin/config', '/admin/audit']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Two-step verification required')).toHaveCount(0);
    await expect(page.getByText(/Something went wrong/)).toHaveCount(0);
  }
  // add a locality through the catalogue editor
  await page.goto('/admin/catalogue');
  await page.getByRole('tab', { name: 'Localities' }).click();
  await page.getByRole('button', { name: 'Add' }).click();
  const d = page.locator('dialog[open]');
  await d.getByLabel('Locality').fill(`Test Nagar ${Date.now() % 10000}`);
  await d.getByLabel('City').fill('Pune');
  await d.getByLabel('State').fill('Maharashtra');
  await d.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Pune').first()).toBeVisible();
  expect(errors).toEqual([]);
});
