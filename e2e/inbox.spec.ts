import { expect, test } from '@playwright/test';
import { signIn, uniquePhone, watchErrors } from './helpers';

/**
 * Smart inbox end to end: set up the folders, add files, see them turn into tasks and list items, undo.
 * The computer-folder watcher is exercised with the browser's private file system standing in for the
 * folder picker (the real picker is a native dialog).
 */
test('files added to the inbox become tasks and list items, and can be undone', async ({ page }) => {
  const errors = watchErrors(page);
  await signIn(page, uniquePhone(), 'Asha');
  await page.goto('/inbox');
  await expect(page.getByRole('heading', { name: 'Smart inbox' })).toBeVisible();
  await expect(page.getByText('Home - Shopping lists')).toBeVisible();
  await page.getByRole('button', { name: 'Create my inbox folders' }).click();
  await expect(page.getByRole('heading', { name: 'What arrived' })).toBeVisible();

  await page.getByLabel('Put in').selectOption({ label: 'Tasks' });
  await page.locator('input[type=file]').setInputFiles({ name: 'todo.txt', mimeType: 'text/plain', buffer: Buffer.from('- Pay electricity bill by 2030-10-25\n- Call the plumber') });
  const card = page.getByRole('listitem').filter({ hasText: 'todo.txt' });
  await expect(card.getByText('Added', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(card.getByRole('link', { name: /Pay electricity bill/ })).toBeVisible();

  await card.getByRole('link', { name: /Pay electricity bill/ }).click();
  await expect(page).toHaveURL(/\/tasks\//);
  await expect(page.getByText('Pay electricity bill').first()).toBeVisible();

  await page.goto('/inbox');
  await page.getByRole('listitem').filter({ hasText: 'todo.txt' }).getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'todo.txt' }).getByText('Undone', { exact: true })).toBeVisible();
  await page.goto('/tasks');
  await expect(page.getByText('Pay electricity bill')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a connected computer folder gets the subfolders, and new files in it are sent to the inbox', async ({ page }) => {
  const errors = watchErrors(page);
  // Stand-in for the native folder picker: a folder in the browser's private file system.
  await page.addInitScript(() => {
    (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker = async () =>
      (await navigator.storage.getDirectory()).getDirectoryHandle('My LifeSphere', { create: true });
  });
  await signIn(page, uniquePhone(), 'Ravi');
  await page.goto('/inbox');
  await page.getByRole('button', { name: 'Create my inbox folders' }).click();
  await page.getByRole('button', { name: 'Choose a folder' }).click();
  await expect(page.getByText('Watching “My LifeSphere”')).toBeVisible();

  // The subfolders were created in the chosen folder.
  const made = await page.evaluate(async () => {
    const root = await (await navigator.storage.getDirectory()).getDirectoryHandle('My LifeSphere');
    const names: string[] = [];
    for await (const [name] of (root as unknown as { entries(): AsyncIterable<[string, unknown]> }).entries()) names.push(name);
    return names.sort();
  });
  expect(made).toEqual(expect.arrayContaining(['Calendar', 'Home - Shopping lists', 'Tasks', 'Not sure']));

  // Put a shopping list in the shopping subfolder, then check.
  await page.evaluate(async () => {
    const root = await (await navigator.storage.getDirectory()).getDirectoryHandle('My LifeSphere');
    const shop = await root.getDirectoryHandle('Home - Shopping lists');
    const f = await shop.getFileHandle('groceries.txt', { create: true });
    const w = await (f as unknown as { createWritable(): Promise<{ write(s: string): Promise<void>; close(): Promise<void> }> }).createWritable();
    await w.write('Rice 5 kg\nMilk 2 L');
    await w.close();
  });
  await page.getByRole('button', { name: 'Check now' }).click();
  await expect(page.getByText('Sent 1 new files to your inbox')).toBeVisible();
  const card = page.getByRole('listitem').filter({ hasText: 'groceries.txt' });
  await expect(card.getByText('Added', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(card.getByRole('link', { name: /Rice/ })).toBeVisible();
  // Checking again sends nothing twice.
  await page.getByRole('button', { name: 'Check now' }).click();
  await expect(page.getByText('No new files')).toBeVisible();
  expect(errors).toEqual([]);
});
