import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';

/**
 * "Continue with Google" up to Google's page and back. Runs only when the API has Google sign-in turned on;
 * the code exchange itself is covered by the API's tests.
 */
test('Continue with Google sends the browser to Google and handles coming back', async ({ page, request }) => {
  const health = await (await request.get('/api/v1/health/ready')).json();
  test.skip(health.integrations?.googleSignIn !== 'on', 'Google sign-in is off on this API');
  const errors = watchErrors(page);

  let googleUrl: URL | null = null;
  await page.route('https://accounts.google.com/**', (route) => {
    googleUrl = new URL(route.request().url());
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Google</h1>' });
  });

  await page.goto('/sign-in?next=/calendar');
  // A new account needs the two consent boxes first.
  await page.getByLabel(/creating a new account/).check();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeDisabled();
  await page.getByLabel(/18 years/).check();
  await page.getByLabel(/accept the Terms/).check();
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('heading', { name: 'Google' })).toBeVisible();

  const u = googleUrl!;
  expect(u.searchParams.get('redirect_uri')).toMatch(/\/auth\/google\/callback$/);
  expect(u.searchParams.get('code_challenge_method')).toBe('S256');
  expect(u.searchParams.get('scope')).toBe('openid email profile');
  const cookies = await page.context().cookies();
  const state = cookies.find((c) => c.name === 'ls_google');
  expect(state?.httpOnly).toBe(true);

  // The person presses Cancel at Google.
  await page.goto(`/auth/google/callback?error=access_denied&state=${u.searchParams.get('state')}`);
  await expect(page).toHaveURL(/\/sign-in\?google=cancelled&next=%2Fcalendar/);
  await expect(page.getByText('Google sign-in was cancelled.')).toBeVisible();

  // A forged return without the cookie is refused.
  await page.goto('/auth/google/callback?code=x&state=y');
  await expect(page).toHaveURL(/google=failed/);
  expect(errors).toEqual([]);
});
