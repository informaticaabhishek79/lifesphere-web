import { expect, test } from '@playwright/test';
import { signIn, uniquePhone, watchErrors } from './helpers';

const dialog = (page: import('@playwright/test').Page) => page.locator('dialog[open]');

test('documents, a documents agent limited to its folders, and an email agent reply', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await signIn(page, uniquePhone(), 'Priya');

  // Two folders: one for the agent, one private.
  await page.goto('/documents');
  for (const name of ['Bills', 'Private']) {
    await page.getByRole('button', { name: 'New folder' }).first().click();
    await dialog(page).getByLabel('Folder name').fill(name);
    await dialog(page).getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await page.locator('input[type=file]').setInputFiles({ name: name === 'Bills' ? 'electricity.txt' : 'diary.txt', mimeType: 'text/plain', buffer: Buffer.from(name === 'Bills' ? 'Amount due: 1,240' : 'my private diary') });
    await expect(page.getByText(name === 'Bills' ? 'electricity.txt' : 'diary.txt')).toBeVisible();
  }

  // Documents agent with edit access to Bills only.
  await page.goto('/agents');
  await page.getByRole('button', { name: 'New agent' }).first().click();
  await dialog(page).getByRole('radio', { name: 'Documents' }).click();
  await dialog(page).getByLabel('Name').fill('Filing helper');
  await dialog(page).getByLabel('Bills', { exact: true }).selectOption('edit');
  await dialog(page).getByRole('button', { name: 'Create' }).click();
  await page.getByRole('link', { name: /Filing helper/ }).click();
  const ask = async (q: string) => {
    await page.getByLabel('Ask this agent').fill(q);
    await page.getByRole('button', { name: 'Run' }).click();
    await expect(page.getByText(`You asked: ${q}`).first()).toBeVisible();
  };
  await ask('List my files');
  await expect(page.locator('main')).toContainText('electricity.txt');
  await expect(page.locator('main')).not.toContainText('diary.txt');
  await ask('Summarise diary.txt');
  await expect(page.getByText(/couldn't find "diary.txt"/).first()).toBeVisible();

  // Email agent replies to the chosen email in the sample mailbox.
  await page.goto('/email');
  await page.getByRole('button', { name: 'Try the sample mailbox' }).click();
  await page.getByText('Plumber visit on Saturday?').first().click();
  await expect(page.getByText('fix the kitchen tap')).toBeVisible();
  await page.getByRole('button', { name: 'Create an email agent' }).click();
  await dialog(page).getByLabel('Name').fill('Mail helper');
  await dialog(page).getByRole('button', { name: 'Create' }).click();
  await page.getByLabel('What should the reply say?').fill('Say Saturday 10 to 12 works for me');
  await page.getByRole('button', { name: 'Reply', exact: true }).click();
  await expect(page.getByText('Reply sent')).toBeVisible();
  await expect(page.getByText('Saturday 10 to 12 works for me.').first()).toBeVisible();

  expect(errors).toEqual([]);
});
