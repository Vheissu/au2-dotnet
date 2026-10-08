import { createFixture } from '@aurelia/testing';
import { RouterConfiguration } from '@aurelia/router';
import { expect, it } from 'vitest';
import { NotFound } from '../src/routes/not-found';

it('renders an accessible recovery link for unknown pages', async () => {
  const fixture = createFixture('<not-found></not-found>', {}, [NotFound, RouterConfiguration]);
  await fixture.started;
  expect(fixture.appHost.querySelector('h1')?.textContent).toBe('Nothing at this address.');
  expect(fixture.appHost.querySelector('a')?.textContent).toContain('Back to your workspace');
});
