import { resolve } from 'aurelia';
import type { IRouteViewModel } from '@aurelia/router';
import { WorkItemsApi, type WorkItem, messageFor } from '../api/work-items-api';

export type Filter = 'all' | 'active' | 'complete';

export class Workspace implements IRouteViewModel {
  private readonly api = resolve(WorkItemsApi);
  private controller = new AbortController();
  items: WorkItem[] = [];
  title = '';
  filter: Filter = 'all';
  isLoading = false;
  isSaving = false;
  pendingId: string | null = null;
  editingId: string | null = null;
  editTitle = '';
  deleteId: string | null = null;
  error = '';
  announcement = '';
  connected = false;

  get completedCount() {
    return this.items.filter((item) => item.isComplete).length;
  }
  get activeCount() {
    return this.items.length - this.completedCount;
  }
  get progress() {
    return this.items.length ? Math.round((this.completedCount / this.items.length) * 100) : 0;
  }
  get visibleItems() {
    return this.items.filter(
      (item) =>
        this.filter === 'all' || (this.filter === 'complete' ? item.isComplete : !item.isComplete),
    );
  }
  get busy() {
    return this.isLoading || this.isSaving || this.pendingId !== null;
  }
  get emptyTitle() {
    return this.items.length === 0 ? 'Room for your first idea.' : 'Nothing here just yet.';
  }
  get emptyMessage() {
    return this.items.length === 0
      ? 'Add a task above to give your new stack a spin.'
      : 'Try another filter, or add something new.';
  }

  loading() {
    void this.refresh();
  }
  unloading() {
    this.controller.abort();
  }

  async refresh() {
    if (this.busy) return;
    this.isLoading = true;
    this.error = '';
    try {
      this.items = await this.api.list(this.controller.signal);
      this.connected = true;
      this.editingId = null;
      this.deleteId = null;
    } catch (error) {
      if (!this.controller.signal.aborted) {
        this.error = messageFor(error);
        this.connected = false;
      }
    } finally {
      this.isLoading = false;
    }
  }

  async add() {
    if (this.busy || !this.title.trim()) return;
    this.isSaving = true;
    this.error = '';
    try {
      const item = await this.api.create(this.title.trim(), this.controller.signal);
      this.items = [...this.items, item];
      this.title = '';
      this.filter = 'all';
      this.announcement = 'Task added.';
    } catch (error) {
      if (!this.controller.signal.aborted) this.error = messageFor(error);
    } finally {
      this.isSaving = false;
    }
  }

  startEditing(item: WorkItem) {
    if (this.busy) return;
    this.editingId = item.id;
    this.editTitle = item.title;
    this.deleteId = null;
  }
  cancelEditing() {
    if (this.busy || this.editingId === null) return;
    const id = this.editingId;
    this.editingId = null;
    focusElement(`edit-button-${id}`);
  }

  confirmDelete(item: WorkItem) {
    if (this.busy) return;
    this.deleteId = item.id;
    this.editingId = null;
    focusElement(`keep-${item.id}`);
  }
  cancelDelete(item: WorkItem) {
    if (this.busy) return;
    this.deleteId = null;
    focusElement(`delete-button-${item.id}`);
  }

  async save(item: WorkItem) {
    if (!this.editTitle.trim()) return;
    const saved = await this.mutate(
      item,
      () => this.api.update(item, this.editTitle.trim(), item.isComplete, this.controller.signal),
      'Task updated.',
    );
    if (saved) focusElement(`edit-button-${item.id}`);
  }

  async toggle(item: WorkItem) {
    await this.mutate(
      item,
      () => this.api.update(item, item.title, !item.isComplete, this.controller.signal),
      item.isComplete ? 'Task reopened.' : 'Task completed.',
    );
  }

  async remove(item: WorkItem) {
    const removed = await this.mutate(
      item,
      async () => {
        await this.api.remove(item, this.controller.signal);
        return null;
      },
      'Task deleted.',
    );
    if (removed) focusElement('new-task');
  }

  private async mutate(
    item: WorkItem,
    action: () => Promise<WorkItem | null>,
    announcement: string,
  ): Promise<boolean> {
    if (this.busy) return false;
    this.pendingId = item.id;
    this.error = '';
    try {
      const updated = await action();
      this.items = updated
        ? this.items.map((existing) => (existing.id === item.id ? updated : existing))
        : this.items.filter((existing) => existing.id !== item.id);
      this.editingId = null;
      this.deleteId = null;
      this.announcement = announcement;
      return true;
    } catch (error) {
      if (!this.controller.signal.aborted) this.error = messageFor(error);
      return false;
    } finally {
      this.pendingId = null;
    }
  }
}

// Keyboard and screen reader users keep their place when a control they used is replaced or removed.
// Aurelia updates the view synchronously, so the target already exists when this runs.
function focusElement(id: string) {
  document.getElementById(id)?.focus();
}
