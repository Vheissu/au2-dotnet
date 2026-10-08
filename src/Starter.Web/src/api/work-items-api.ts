import createClient from 'openapi-fetch';
import type { components, paths } from './generated/schema';

export type WorkItem = components['schemas']['WorkItemResponse'];

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function messageFor(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'The API is unreachable. Check your connection, then try again.';
}

export class WorkItemsApi {
  private readonly client = createClient<paths>({ baseUrl: window.location.origin });

  async list(signal?: AbortSignal): Promise<WorkItem[]> {
    const result = await this.client.GET('/api/work-items', { signal });
    if (!result.response.ok) throw this.error(result.response.status, result.error);
    return result.data ?? [];
  }

  async create(title: string, signal?: AbortSignal): Promise<WorkItem> {
    const result = await this.client.POST('/api/work-items', { body: { title }, signal });
    if (!result.data) throw this.error(result.response.status, result.error);
    return result.data;
  }

  async update(
    item: WorkItem,
    title: string,
    isComplete: boolean,
    signal?: AbortSignal,
  ): Promise<WorkItem> {
    const result = await this.client.PUT('/api/work-items/{id}', {
      params: { path: { id: item.id } },
      body: { title, isComplete, version: item.version },
      signal,
    });
    if (!result.data) throw this.error(result.response.status, result.error);
    return result.data;
  }

  async remove(item: WorkItem, signal?: AbortSignal): Promise<void> {
    const result = await this.client.DELETE('/api/work-items/{id}', {
      params: { path: { id: item.id }, query: { version: item.version } },
      signal,
    });
    if (!result.response.ok) throw this.error(result.response.status, result.error);
  }

  private error(status: number, problem: unknown): ApiError {
    if (status === 409)
      return new ApiError(
        status,
        'This task was changed elsewhere. Refresh the list before trying again.',
      );
    if (status === 404)
      return new ApiError(
        status,
        'This task no longer exists. Refresh the list to see the latest changes.',
      );
    if (status === 400 && problem && typeof problem === 'object' && 'errors' in problem) {
      const errors = problem.errors;
      if (errors && typeof errors === 'object') {
        const messages = Object.values(errors)
          .flat()
          .filter((value): value is string => typeof value === 'string');
        if (messages.length) return new ApiError(status, messages.join(' '));
      }
    }
    return new ApiError(status, 'The server could not complete your request. Please try again.');
  }
}
