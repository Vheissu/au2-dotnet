import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ request }) => {
  const response = await request.get('/api/work-items');
  expect(response.ok()).toBe(true);
  for (const item of await response.json()) {
    expect((await request.delete(`/api/work-items/${item.id}?version=${item.version}`)).ok()).toBe(
      true,
    );
  }
});

test('creates, edits, completes, filters, persists, and deletes a task', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A fresh start.' })).toBeVisible();
  await expect(page.getByText('Connected to your API')).toBeVisible();
  await expect(page.getByText('Room for your first idea.')).toBeVisible();
  await page.getByRole('textbox', { name: 'New task' }).fill('Build my application');
  await page.getByRole('textbox', { name: 'New task' }).press('Enter');
  await expect(page.getByText('Build my application', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Build my application', exact: true }).click();
  await page.getByRole('textbox', { name: 'Task title' }).fill('Ship my application');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Complete Ship my application', exact: true }).click();
  await expect(page.getByText('1 of 1 tasks completed')).toBeVisible();
  await page.getByRole('button', { name: 'Active', exact: true }).click();
  await expect(page.getByText('Ship my application', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await expect(page.getByText('Ship my application', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Ship my application', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reopen Ship my application', exact: true }).click();
  await expect(page.getByText('0 of 1 tasks completed')).toBeVisible();
  await page.getByRole('button', { name: 'Delete Ship my application', exact: true }).click();
  await page.getByRole('button', { name: 'Keep task' }).click();
  await expect(page.getByText('Ship my application', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete Ship my application', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, delete' }).click();
  await expect(page.getByText('Room for your first idea.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('supports direct routes, browser history, and unknown pages', async ({ page }) => {
  await page.goto('/guide');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page).toHaveURL('/guide');
  await expect(page.getByRole('heading', { name: 'A stack you can follow.' })).toBeVisible();
  await page.getByRole('link', { name: 'Workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A fresh start.' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'A stack you can follow.' })).toBeVisible();
  await page.goto('/a-page-that-does-not-exist');
  await expect(page.getByRole('heading', { name: 'Nothing at this address.' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to your workspace' }).click();
  await expect(page.getByRole('heading', { name: 'A fresh start.' })).toBeVisible();
});

test('recovers from an unavailable API without losing the draft', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Connected to your API')).toBeVisible();
  await page.route('**/api/work-items', (route) => route.abort());
  await page.getByRole('textbox', { name: 'New task' }).fill('Keep this draft');
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByRole('alert')).toContainText('unreachable');
  await expect(page.getByRole('textbox', { name: 'New task' })).toHaveValue('Keep this draft');
  await page.unroute('**/api/work-items');
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText('Keep this draft', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('handles stale changes without overwriting server data', async ({ page, request }) => {
  const created = await request.post('/api/work-items', { data: { title: 'Original' } });
  const item = await created.json();
  await page.goto('/');
  await expect(page.getByText('Original', { exact: true })).toBeVisible();
  await request.put(`/api/work-items/${item.id}`, {
    data: { title: 'Changed elsewhere', isComplete: false, version: item.version },
  });
  await page.getByRole('button', { name: 'Complete Original', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('changed elsewhere');
  await page.getByRole('button', { name: 'Refresh and try again' }).click();
  await expect(page.getByText('Changed elsewhere', { exact: true })).toBeVisible();
});

test('is accessible and fits the viewport', async ({ page, request }) => {
  await request.post('/api/work-items', {
    data: {
      title:
        'A task with a title that wraps neatly on a narrow screen without pushing the controls off the page',
    },
  });
  await page.goto('/');
  await expect(page.getByText('Connected to your API')).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('link', { name: 'Starter guide', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A stack you can follow.' })).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
