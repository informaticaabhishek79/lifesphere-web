import { expect, test } from '@playwright/test';
import { signIn, uniquePhone, watchErrors } from './helpers';

/**
 * Parent care, both sides: a son sets up "I look after a parent", invites his mother; she accepts on her phone,
 * chooses what to share, sets a daily check-in and a medicine, and gets the simple home.
 */
test('caregiver invites a parent; the parent accepts, shares and sets up her day', async ({ browser }) => {
  const sonCtx = await browser.newContext({ timezoneId: 'Asia/Kolkata' });
  const son = await sonCtx.newPage();
  const sonErrors = watchErrors(son);
  await signIn(son, uniquePhone(), 'Arjun', { keepSetup: true });

  await son.getByTestId('mode-caregiver').click();
  await son.getByRole('button', { name: 'Mum', exact: true }).click();
  const mumPhone = uniquePhone();
  await son.getByLabel(/mobile number/).fill(mumPhone);
  await expect(son.getByLabel('See where they are when they press Get help (for 24 hours)')).not.toBeChecked();
  await son.getByRole('button', { name: 'Send invitation' }).click();
  const link = (await son.locator('code').first().textContent())!.trim();
  await expect(son.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', /wa\.me/);
  await son.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(son.getByRole('heading', { name: 'Make sure alerts reach you' })).toBeVisible();
  await son.getByRole('button', { name: 'Next', exact: true }).click();
  await son.getByRole('button', { name: 'Go to my home screen' }).click();
  await expect(son).toHaveURL(/\/$/);
  await expect(son.getByText(/waiting for them to accept/)).toBeVisible();

  // Mum, on her phone.
  const mumCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Kolkata' });
  const mum = await mumCtx.newPage();
  const mumErrors = watchErrors(mum);
  const u = new URL(link);
  await mum.goto(u.pathname + u.hash);
  await mum.getByRole('link', { name: /Sign in to continue/ }).click();
  await mum.getByLabel('Mobile number', { exact: true }).fill(mumPhone);
  await mum.getByLabel(/creating a new account/).check();
  await mum.getByLabel(/What should we call you/).fill('Kamla');
  await mum.getByLabel(/18 years/).check();
  await mum.getByLabel(/accept the Terms/).check();
  await mum.getByRole('button', { name: 'Send code' }).click();
  const code = (await mum.getByText(/Test mode code: \d{6}/).textContent())!.match(/\d{6}/)![0];
  await mum.getByLabel(/Enter the 6-digit code/).last().fill(code);
  await mum.getByRole('button', { name: /Verify and continue/ }).click();
  await expect(mum).toHaveURL(/\/invite\/contact/);

  await expect(mum.getByText('Arjun asks you to share')).toBeVisible();
  await mum.getByLabel('See my shared calendar').uncheck();
  await mum.getByRole('button', { name: 'Accept' }).click();
  await expect(mum).toHaveURL(/\/get-started\?as=cared_for/);

  // Already shared from the invitation.
  await expect(mum.getByLabel('Tell Arjun if I miss a check-in')).toBeChecked();
  await mum.getByRole('button', { name: 'Next', exact: true }).click();
  await mum.getByRole('button', { name: '09:00' }).click();
  await expect(mum.getByLabel(/tell Arjun/)).toBeChecked();
  await mum.getByRole('button', { name: 'Next', exact: true }).click();
  await mum.getByLabel('Medicine', { exact: true }).fill('BP tablet');
  await mum.getByRole('button', { name: /Night/ }).click();
  await mum.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(mum.getByRole('radio', { name: 'Arjun' })).toBeChecked();
  await mum.getByRole('button', { name: 'Finish' }).click();

  await expect(mum).toHaveURL(/\/$/);
  await expect(mum.getByRole('heading', { name: "Today's medicines" })).toBeVisible();
  await expect(mum.getByText('BP tablet').first()).toBeVisible();
  await expect(mum.getByRole('link', { name: 'Call Arjun' })).toHaveAttribute('href', /^tel:\+91/);
  await expect(mum.getByRole('heading', { name: 'Looking out for you' })).toBeVisible();
  // Focused home: the community is hidden from the menu.
  await mum.getByRole('button', { name: 'Menu' }).click();
  await expect(mum.getByRole('link', { name: 'Community' })).toHaveCount(0);

  // The son now sees her, with sharing about to start (cooling-off), and without the calendar she kept back.
  await son.reload();
  await expect(son.getByRole('heading', { name: 'Mum' })).toBeVisible();
  await expect(son.getByText(/Sharing starts at|All fine|Nothing due|Waiting/).first()).toBeVisible();
  await expect(son.getByText('Shared appointments')).toHaveCount(0);

  expect(sonErrors).toEqual([]);
  expect(mumErrors).toEqual([]);
});

test('settings shows what the home is for and links to change it', async ({ page }) => {
  await signIn(page, uniquePhone(), 'Meera');
  await page.goto('/settings');
  await page.getByRole('tab', { name: 'Features' }).click();
  await expect(page.getByText('What LifeSphere is for')).toBeVisible();
  await page.getByRole('link', { name: 'Change' }).click();
  await expect(page.getByRole('heading', { name: 'What will you use LifeSphere for?' })).toBeVisible();
});
