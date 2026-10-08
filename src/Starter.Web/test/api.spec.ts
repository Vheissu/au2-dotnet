import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkItemsApi, ApiError, type WorkItem } from '../src/api/work-items-api';

const item: WorkItem = {
  id: 'abc',
  title: 'Hello',
  isComplete: false,
  createdAt: '2026-10-09T00:00:00Z',
  version: 'v1',
};
afterEach(() => vi.unstubAllGlobals());

describe('WorkItemsApi', () => {
  it('sends the current version with an update', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(item));
    vi.stubGlobal('fetch', fetch);
    await new WorkItemsApi().update(item, 'Updated', true);
    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.method).toBe('PUT');
    expect(await request.json()).toEqual({ title: 'Updated', isComplete: true, version: 'v1' });
  });

  it('handles a successful delete with no response body', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    await expect(new WorkItemsApi().remove(item)).resolves.toBeUndefined();
    expect((fetch.mock.calls[0]?.[0] as Request).url).toContain('version=v1');
  });

  it('surfaces server validation messages', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ errors: { Title: ['Title is required.'] } }, { status: 400 }),
        ),
    );
    await expect(new WorkItemsApi().create('')).rejects.toThrow('Title is required.');
  });

  it('gives actionable conflict messages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({}, { status: 409 })));
    await expect(new WorkItemsApi().update(item, 'Updated', true)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('Refresh'),
    });
  });

  it('does not expose internal server error details', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(Response.json({ detail: 'Private database path' }, { status: 500 })),
    );
    await expect(new WorkItemsApi().list()).rejects.toEqual(
      new ApiError(500, 'The server could not complete your request. Please try again.'),
    );
  });
});
