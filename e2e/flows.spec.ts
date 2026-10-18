import { expect, test, type Page } from '@playwright/test';
import { signIn, uniquePhone, watchErrors } from './helpers';

const dialog = (page: Page) => page.locator('dialog[open]');

test('LifeOS and household tools', async ({ page }) => {
  const errors = watchErrors(page);
  await signIn(page, uniquePhone(), 'Asha');

  // Task: create, see it, complete it
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'New task' }).click();
  await dialog(page).getByLabel('Title').fill('Pay electricity bill');
  await dialog(page).getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('link', { name: /Pay electricity bill/ })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Mark as done' }).first().click();
  await page.getByRole('tab', { name: 'Done' }).click();
  await expect(page.getByText('Pay electricity bill')).toBeVisible();

  // Reminder
  await page.goto('/reminders');
  await page.getByRole('button', { name: 'New reminder' }).click();
  await dialog(page).getByLabel('Title').fill('Take medicine');
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Take medicine')).toBeVisible();

  // Calendar event (agenda view)
  await page.goto('/calendar');
  await page.getByRole('button', { name: 'New event' }).click();
  await dialog(page).getByLabel('Title').fill('Doctor visit');
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await page.getByRole('radio', { name: 'Upcoming' }).click();
  await expect(page.getByText('Doctor visit')).toBeVisible();

  // Household + announcement + invite
  await page.goto('/households');
  await page.getByRole('button', { name: 'New household' }).first().click();
  await dialog(page).getByLabel('Name').fill('Verma home');
  await dialog(page).getByRole('button', { name: 'Create' }).click();
  await page.getByRole('link', { name: /Verma home/ }).click();
  await expect(page.getByRole('heading', { name: 'Verma home' })).toBeVisible();
  await page.getByRole('button', { name: 'Post announcement' }).click();
  await dialog(page).getByLabel('Message').fill('Plumber visiting Saturday');
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Plumber visiting Saturday')).toBeVisible();
  await page.getByRole('button', { name: 'Invite' }).click();
  await dialog(page).getByLabel('Mobile number').fill(uniquePhone());
  await dialog(page).getByRole('button', { name: 'Send' }).click();
  await expect(dialog(page).getByText('Invitation created')).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Done' }).click();

  // Shopping list
  await page.goto('/lists');
  await page.getByRole('button', { name: 'New list' }).first().click();
  await dialog(page).getByLabel('Name').fill('Weekly groceries');
  await dialog(page).getByRole('button', { name: 'Create' }).click();
  await page.getByRole('link', { name: /Weekly groceries/ }).click();
  await expect(page.getByRole('heading', { name: 'Weekly groceries' })).toBeVisible();
  await page.getByLabel('Add an item…').fill('Atta');
  await page.getByLabel('Qty').fill('5');
  await page.getByLabel('Unit').fill('kg');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Atta' }).click();
  await expect(page.getByText(/Got it \(1\)/)).toBeVisible();

  // Inventory with maintenance schedule
  await page.goto('/inventory');
  await page.getByRole('button', { name: 'Add item' }).first().click();
  await dialog(page).getByLabel('Name').fill('Water purifier');
  await dialog(page).getByRole('button', { name: 'Create' }).click();
  await page.getByRole('link', { name: /Water purifier/ }).click();
  await expect(page.getByRole('heading', { name: 'Water purifier' })).toBeVisible();
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await dialog(page).getByLabel('Title').fill('Replace filter');
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Replace filter')).toBeVisible();

  // Budget
  await page.goto('/budgets');
  await page.getByRole('button', { name: 'Add category' }).first().click();
  await dialog(page).getByLabel('Category').fill('Groceries');
  await dialog(page).getByLabel('Planned').fill('8000');
  await dialog(page).getByLabel('Spent').fill('2500');
  await dialog(page).getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Groceries')).toBeVisible();

  expect(errors).toEqual([]);
});

test('family care: contact invitation, sharing and the help button', async ({ browser }) => {
  test.setTimeout(240_000);
  const a = await browser.newPage();
  const b = await browser.newPage();
  const errA = watchErrors(a);
  const errB = watchErrors(b);
  const phoneB = uniquePhone();
  await signIn(a, uniquePhone(), 'Kamla');

  // A invites B, offering help alerts
  await a.goto('/contacts');
  await a.getByRole('button', { name: 'Invite someone' }).first().click();
  await dialog(a).getByLabel('Mobile number').fill(phoneB);
  await dialog(a).getByLabel('Label').fill('Daughter');
  await dialog(a).getByRole('button', { name: 'Send' }).click();
  await expect(dialog(a).getByText('Invitation created')).toBeVisible();
  const link = (await dialog(a).locator('code').textContent())!;
  await dialog(a).getByRole('button', { name: 'Done' }).click();

  // B signs up and accepts through the invite link
  await signIn(b, phoneB, 'Priya');
  await b.goto(new URL(link).pathname + new URL(link).hash);
  await expect(b.getByText(/would like to add you/)).toBeVisible();
  await b.getByRole('button', { name: 'Accept' }).click();
  await expect(b).toHaveURL(/\/contacts/);
  await expect(b.getByText('Kamla')).toBeVisible();

  // A sees B, sharing is waiting out the cooling-off period
  await a.goto('/sharing');
  await expect(a.getByText('Priya')).toBeVisible();
  await expect(a.getByText(/Starts soon|Active/).first()).toBeVisible();

  // Check-in schedule for A
  await a.goto('/check-ins');
  await a.getByRole('button', { name: 'New check-in' }).click();
  await dialog(a).getByLabel('Name').fill('Morning check-in');
  await dialog(a).getByRole('button', { name: 'Save' }).click();
  await expect(a.getByText('Morning check-in')).toBeVisible();
  await a.getByRole('button', { name: /I’m OK — check in/ }).click();

  // Wait out the cooling-off (dev server uses 1 minute), then A presses Get help
  await a.waitForTimeout(65_000);
  await a.goto('/help');
  await a.getByRole('button', { name: /Alert my contacts/ }).click();
  await dialog(a).getByLabel('Message').fill('I have fallen');
  await dialog(a).getByRole('button', { name: 'Send alert now' }).click();
  await expect(dialog(a).getByText('Help is on the way')).toBeVisible();

  // B sees the alert and responds
  await b.goto('/help');
  await expect(b.getByText('Kamla needs help').first()).toBeVisible();
  await b.getByText('Kamla needs help').first().click();
  await b.getByRole('button', { name: /I’m responding/ }).click();
  await expect(b.getByText(/Responding since/)).toBeVisible();

  expect([...errA, ...errB]).toEqual([]);
});

test('community, consumer, civic, services and assistant', async ({ page }) => {
  const errors = watchErrors(page);
  await signIn(page, uniquePhone(), 'Ravi');

  // Community group, post, comment, reaction
  await page.goto('/community?tab=groups');
  await page.getByRole('button', { name: 'Create group' }).click();
  await dialog(page).getByLabel('Name').fill('Block C Residents');
  await dialog(page).getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('heading', { name: 'Block C Residents' })).toBeVisible();
  await page.getByRole('button', { name: /Share something with the group/ }).click();
  await dialog(page).getByLabel('Message').fill('Water supply off tomorrow 10–2');
  await dialog(page).getByRole('button', { name: 'Post', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await page.getByRole('link').filter({ hasText: 'Water supply off tomorrow 10–2' }).click();
  await page.waitForURL(/\/community\/posts\//);
  await page.getByRole('button', { name: /Thanks/ }).first().click();
  await page.getByLabel('Write a comment…').fill('Thanks for sharing');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Thanks for sharing')).toBeVisible();

  // Consumer case with an AI draft
  await page.goto('/consumer?new=1');
  await dialog(page).getByLabel('What is it about').fill('Mixer stopped working');
  await dialog(page).getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('heading', { name: 'Mixer stopped working' })).toBeVisible();
  await page.getByRole('button', { name: 'Draft it for me' }).click();
  await dialog(page).getByLabel('What happened').fill('It stopped after two weeks of use.');
  await dialog(page).getByLabel('What you want').fill('A replacement');
  await dialog(page).getByRole('button', { name: 'Draft it' }).click();
  await page.getByRole('button', { name: 'I’ve reviewed this' }).click();
  await expect(page.getByText(/Approved/)).toBeVisible();

  // Civic issue
  await page.goto('/civic');
  await page.getByRole('button', { name: 'Record an issue' }).click();
  await dialog(page).getByLabel('What’s the problem').fill('Streetlight not working for a week');
  await dialog(page).getByRole('button', { name: 'Create' }).click();
  await expect(dialog(page).getByText('Saved. Now report it')).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Done' }).click();

  // Provider profile and an open service request
  await page.goto('/provider-portal');
  await page.getByRole('button', { name: 'Create provider profile' }).first().click();
  await dialog(page).getByLabel('Business or display name').fill('Ravi Repairs');
  await dialog(page).getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('heading', { name: 'Ravi Repairs' })).toBeVisible();
  await page.goto('/services');
  await page.getByRole('button', { name: 'Post a request' }).first().click();
  await dialog(page).getByLabel('Category').selectOption({ index: 1 });
  await dialog(page).getByLabel('What do you need').fill('Kitchen tap leaking');
  await dialog(page).getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('heading', { name: 'Kitchen tap leaking' })).toBeVisible();

  // Assistant
  await page.goto('/assistant');
  await page.getByLabel('Ask', { exact: true }).fill('How do I complain about a defective product?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page.getByText(/Simulated/).first()).toBeVisible();

  expect(errors).toEqual([]);
});
