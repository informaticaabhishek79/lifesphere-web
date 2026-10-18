import { expect, test } from '@playwright/test';
import { signIn, uniquePhone, watchErrors } from './helpers';

// The browser's speech recogniser is replaced by a scripted one; what would be spoken is recorded.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    const w = window as unknown as Record<string, unknown> & { __say: string[]; __spoken: { text: string; lang: string }[] };
    w.__say = [];
    w.__spoken = [];
    class FakeRec {
      lang = '';
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        const text = w.__say.shift();
        setTimeout(() => {
          if (text) this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
          else this.onerror?.({ error: 'no-speech' });
          this.onend?.();
        }, 200);
      }
      stop() {}
      abort() {}
    }
    for (const k of ['webkitSpeechRecognition', 'SpeechRecognition']) Object.defineProperty(window, k, { value: FakeRec, configurable: true, writable: true });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak: (u: SpeechSynthesisUtterance) => {
          w.__spoken.push({ text: u.text, lang: u.lang });
          setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 20);
        },
        cancel: () => {},
        getVoices: () => [],
      },
    });
  });
});

test('voice assistant: spoken question, answer from the right feature, read aloud', async ({ page }) => {
  const errors = watchErrors(page);
  await signIn(page, uniquePhone(), 'Asha');
  await page.goto('/lists');
  await page.getByRole('button', { name: 'New list' }).first().click();
  await page.locator('dialog[open]').getByLabel('Name').fill('Groceries');
  await page.locator('dialog[open]').getByRole('button', { name: 'Create' }).click();
  await page.getByRole('link', { name: /Groceries/ }).click();
  await page.getByLabel('Add an item…').fill('Atta');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Atta')).toBeVisible();

  await page.evaluate(() => (window as unknown as { __say: string[] }).__say.push('What do I need to buy?'));
  await page.locator('header').getByRole('link', { name: 'Voice assistant' }).click();
  await expect(page.getByText('What do I need to buy?').first()).toBeVisible();
  await expect(page.getByText('Groceries: Atta.')).toBeVisible();
  await expect(page.getByText('Shopping lists', { exact: true }).last()).toBeVisible();
  const spoken = await page.evaluate(() => (window as unknown as { __spoken: { text: string; lang: string }[] }).__spoken);
  expect(spoken[0].lang).toMatch(/^en/);
  expect(spoken[0].text).toContain('Atta');

  await page.getByLabel('Or type your question').fill('How do I set up a check-in?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page.getByText(/New check-in/).last()).toBeVisible();
  expect(errors).toEqual([]);
});
