import { DI, Registration } from 'aurelia';
import { describe, expect, it, vi } from 'vitest';
import { Workspace } from '../src/routes/workspace';
import { WorkItemsApi, ApiError, type WorkItem } from '../src/api/work-items-api';

const item: WorkItem = {
  id: '1',
  title: 'Build something',
  isComplete: false,
  createdAt: '2026-10-09T00:00:00Z',
  version: 'v1',
};

function setup() {
  const api = {
    list: vi.fn().mockResolvedValue([item]),
    create: vi.fn().mockResolvedValue(item),
    update: vi.fn(),
    remove: vi.fn(),
  };
  const container = DI.createContainer();
  container.register(Registration.instance(WorkItemsApi, api));
  return { vm: container.get(Workspace), api };
}

describe('Workspace', () => {
  it('loads persisted tasks and computes progress and filters', async () => {
    const { vm, api } = setup();
    api.list.mockResolvedValue([item, { ...item, id: '2', isComplete: true }]);
    await vm.refresh();
    expect(vm.connected).toBe(true);
    expect(vm.progress).toBe(50);
    expect(vm.activeCount).toBe(1);
    vm.filter = 'complete';
    expect(vm.visibleItems.map((task) => task.id)).toEqual(['2']);
    vm.filter = 'active';
    expect(vm.visibleItems.map((task) => task.id)).toEqual(['1']);
  });

  it('keeps the draft and clears busy state when creation fails', async () => {
    const { vm, api } = setup();
    vm.title = 'My idea';
    api.create.mockRejectedValue(new TypeError('Failed to fetch'));
    await vm.add();
    expect(vm.title).toBe('My idea');
    expect(vm.items).toEqual([]);
    expect(vm.error).toContain('unreachable');
    expect(vm.busy).toBe(false);
  });

  it('ignores blank titles and prevents duplicate concurrent submissions', async () => {
    const { vm, api } = setup();
    vm.title = '   ';
    await vm.add();
    expect(api.create).not.toHaveBeenCalled();
    let finish!: (value: WorkItem) => void;
    api.create.mockReturnValue(
      new Promise<WorkItem>((resolve) => {
        finish = resolve;
      }),
    );
    vm.title = '  Build something  ';
    const first = vm.add();
    await vm.add();
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.create.mock.calls[0]?.[0]).toBe('Build something');
    finish(item);
    await first;
    expect(vm.title).toBe('');
    expect(vm.items).toEqual([item]);
  });

  it('preserves the current state when an update conflicts', async () => {
    const { vm, api } = setup();
    await vm.refresh();
    api.update.mockRejectedValue(new ApiError(409, 'Refresh before trying again.'));
    await vm.toggle(item);
    expect(vm.items[0]?.isComplete).toBe(false);
    expect(vm.error).toContain('Refresh');
    expect(vm.pendingId).toBeNull();
  });

  it('accepts the server version after edits and removes a deleted task', async () => {
    const { vm, api } = setup();
    await vm.refresh();
    vm.startEditing(item);
    vm.editTitle = 'Revised';
    api.update.mockResolvedValue({ ...item, title: 'Revised', version: 'v2' });
    await vm.save(item);
    expect(vm.items[0]?.version).toBe('v2');
    expect(vm.editingId).toBeNull();
    await vm.remove(vm.items[0]!);
    expect(vm.items).toEqual([]);
    expect(vm.progress).toBe(0);
  });

  it('ignores row actions while a request is in flight', async () => {
    const { vm, api } = setup();
    await vm.refresh();
    let finish!: (value: WorkItem) => void;
    api.update.mockReturnValue(
      new Promise<WorkItem>((resolve) => {
        finish = resolve;
      }),
    );
    const pending = vm.toggle(item);
    vm.startEditing(item);
    vm.confirmDelete(item);
    await vm.toggle(item);
    expect(vm.editingId).toBeNull();
    expect(vm.deleteId).toBeNull();
    expect(api.update).toHaveBeenCalledTimes(1);
    finish({ ...item, isComplete: true, version: 'v2' });
    await pending;
    expect(vm.items[0]?.isComplete).toBe(true);
  });

  it('aborts pending requests when navigating away without showing an error', async () => {
    const { vm, api } = setup();
    api.list.mockImplementation(
      (signal: AbortSignal) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    const pending = vm.refresh();
    vm.unloading();
    await pending;
    expect(api.list.mock.calls[0]?.[0].aborted).toBe(true);
    expect(vm.error).toBe('');
    expect(vm.busy).toBe(false);
  });
});
