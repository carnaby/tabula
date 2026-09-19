import type { Memory, MemoryKind, Note, Project, RecallPreview } from './types';

const TOKEN_KEY = 'tabula.token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getToken() ?? ''}`,
      ...(body !== undefined && { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) {
    clearToken();
    window.location.reload();
    throw new ApiError(401, 'unauthorized');
  }
  if (!res.ok) {
    const e = (await res.json().catch(() => ({}))) as { message?: string };
    throw new ApiError(res.status, e.message ?? res.statusText);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const qs = (params: Record<string, string | undefined>) => {
  const entries = Object.entries(params).filter((e): e is [string, string] => Boolean(e[1]));
  return entries.length ? `?${new URLSearchParams(entries)}` : '';
};

type MemoryInput = { projectId: string; kind: MemoryKind; title: string; body: string; tags?: string[] };
type NoteInput = { title: string; summary?: string; body?: string; tags?: string[]; pinned?: boolean };

export const api = {
  projects: () => request<Project[]>('GET', '/projects'),
  createProject: (p: { id: string; name: string; description?: string }) => request<Project>('POST', '/projects', p),

  memories: (f: { project?: string; kind?: string; status?: string; q?: string }) =>
    request<Memory[]>('GET', `/memories${qs(f)}`),
  createMemory: (m: MemoryInput) => request<Memory>('POST', '/memories', m),
  updateMemory: (id: string, p: Partial<Omit<MemoryInput, 'projectId'>>) => request<Memory>('PATCH', `/memories/${id}`, p),
  deprecateMemory: (id: string, reason: string) =>
    request<{ changed: boolean }>('POST', `/memories/${id}/deprecate`, { reason }),
  deleteMemory: (id: string) => request<void>('DELETE', `/memories/${id}`),
  chain: (id: string) => request<Memory[]>('GET', `/memories/${id}/chain`),

  notes: (f: { project?: string; q?: string }) => request<Note[]>('GET', `/notes${qs(f)}`),
  createNote: (n: NoteInput & { projectId: string }) => request<Note>('POST', '/notes', n),
  updateNote: (id: string, p: Partial<NoteInput>) => request<Note>('PATCH', `/notes/${id}`, p),
  deleteNote: (id: string) => request<void>('DELETE', `/notes/${id}`),

  recall: (project: string) => request<RecallPreview>('GET', `/recall/${encodeURIComponent(project)}`),
};
