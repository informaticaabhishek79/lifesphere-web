import { devices, expect, test } from '@playwright/test';
import { signIn, uniquePhone, watchErrors } from './helpers';

/** Installable app: manifest, icons, service worker with offline page, install guidance, and Share → inbox. */
test('the app can be installed: manifest, icons and the service worker are in place', async ({ page, request }) => {
  const m = await (await request.get('/manifest.webmanifest')).json();
  expect(m).toMatchObject({ name: 'LifeSphere', display: 'standalone', start_url: '/?source=app' });
  expect(m.icons.map((i: { purpose: string }) => i.purpose)).toEqual(expect.arrayContaining(['any', 'maskable']));
  expect(m.share_target).toMatchObject({ action: '/share-target', method: 'POST', enctype: 'multipart/form-data' });
  for (const icon of [...m.icons.map((i: { src: string }) => i.src), '/icons/apple-touch-icon.png', '/icons/badge-96.png']) {
    const r = await request.get(icon);
    expect(r.status(), icon).toBe(200);
    expect(r.headers()['content-type']).toContain('image/png');
  }
  expect((await request.get('/sw.js', { maxRedirects: 0 })).status()).toBe(200);

  const errors = watchErrors(page);
  await signIn(page, uniquePhone(), 'Lata');
  const html = await page.content();
  expect(html).toContain('rel="manifest"');
  expect(html).toContain('apple-touch-icon');
  await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.active), { timeout: 15_000 }).toBe(true);

  // Settings explains how to install on this browser.
  await page.goto('/settings?tab=notifications');
  await page.getByRole('tab', { name: 'Notifications' }).click();
  await expect(page.getByRole('heading', { name: 'Install the app' })).toBeVisible();

  // With no connection, pages show the offline screen instead of a browser error.
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.context().setOffline(true);
  await page.goto('/tasks').catch(() => undefined);
  await expect(page.getByRole('heading', { name: 'You are offline' })).toBeVisible();
  await expect(page.getByText(/emergency number/)).toBeVisible();
  await page.context().setOffline(false);
  expect(errors).toEqual([]);
});

test('on an iPhone the home screen suggests adding LifeSphere, once', async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  await signIn(page, uniquePhone(), 'Mohan');
  await expect(page.getByText('Add LifeSphere to your home screen')).toBeVisible();
  await expect(page.getByText('Choose “Add to Home Screen”')).toBeVisible();
  await page.getByRole('button', { name: 'Not now' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Add LifeSphere to your home screen')).toHaveCount(0);
  await ctx.close();
});

test('sharing a file or a message to the app puts it in the Smart inbox', async ({ page }) => {
  await signIn(page, uniquePhone(), 'Geeta');
  // Android's share sheet posts like this to the installed app.
  const res = await page.request.post('/share-target', {
    multipart: { title: 'Groceries', text: 'Task: Buy medicines for Maa tomorrow', files: { name: 'list.txt', mimeType: 'text/plain', buffer: Buffer.from('Task: Pay the milkman') } },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(303);
  expect(res.headers().location).toMatch(/\/inbox\?shared=1$/);
  // Text without a file becomes a note.
  const text = await page.request.post('/share-target', { multipart: { text: 'Task: Call the electrician' }, maxRedirects: 0 });
  expect(text.headers().location).toMatch(/shared=1$/);

  await page.goto('/inbox?shared=1');
  await expect(page.getByText('Received 1 shared files')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'list.txt' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('listitem').filter({ hasText: 'Shared note' })).toBeVisible();

  // Signed out: sent to sign in, nothing stored.
  await page.context().clearCookies();
  const out = await page.request.post('/share-target', { multipart: { text: 'x' }, maxRedirects: 0 });
  expect(out.headers().location).toContain('/sign-in');
});
