import { BrowserPlatform } from '@aurelia/platform-browser';
import { onFixtureCreated, setPlatform, type IFixture } from '@aurelia/testing';
import { afterEach, beforeAll } from 'vitest';

const fixtures: IFixture<object>[] = [];
beforeAll(() => {
  const platform = new BrowserPlatform(window);
  setPlatform(platform);
  BrowserPlatform.set(globalThis, platform);
  onFixtureCreated((fixture) => {
    fixtures.push(fixture);
  });
});
afterEach(async () => {
  for (const fixture of fixtures.splice(0)) await fixture.stop(true);
});
