import type { Photo, PhotoAlign, PhotoStatus, ServerStatus, WallConfig } from '@photowall/shared';

const TOKEN_KEY = 'photowall-admin-token';
let token = localStorage.getItem(TOKEN_KEY) ?? '';

let onUnauthorized: () => void = () => undefined;
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return token ? { ...extra, 'x-admin-token': token } : extra;
}

async function json<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    onUnauthorized();
    throw new Error('não autorizado');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  /** Troca a senha por um token de sessão; retorna false se a senha for recusada. */
  login: async (password: string): Promise<boolean> => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { token: string | null };
    if (data.token) {
      token = data.token;
      localStorage.setItem(TOKEN_KEY, token);
    }
    return true;
  },

  logout: (): void => {
    token = '';
    localStorage.removeItem(TOKEN_KEY);
  },

  getConfig: () => fetch('/api/config').then((r) => json<WallConfig>(r)),

  putConfig: (patch: unknown) =>
    fetch('/api/config', {
      method: 'PUT',
      headers: authHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify(patch)
    }).then((r) => json<WallConfig>(r)),

  getPhotos: (status?: PhotoStatus) =>
    fetch(`/api/photos${status ? `?status=${status}` : ''}`, { headers: authHeaders() }).then((r) =>
      json<Photo[]>(r)
    ),

  setStatus: (id: string, status: PhotoStatus) =>
    fetch(`/api/photos/${id}/status`, {
      method: 'POST',
      headers: authHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ status })
    }).then((r) => json<Photo>(r)),

  setAlign: (id: string, align: PhotoAlign | null) =>
    fetch(`/api/photos/${id}/align`, {
      method: 'POST',
      headers: authHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ align })
    }).then((r) => json<Photo>(r)),

  approveAll: () =>
    fetch('/api/photos/approve-all', { method: 'POST', headers: authHeaders() }).then((r) =>
      json<{ approved: number }>(r)
    ),

  deletePhoto: (id: string) =>
    fetch(`/api/photos/${id}`, { method: 'DELETE', headers: authHeaders() }).then((r) =>
      json<{ ok: boolean }>(r)
    ),

  uploadPhotos: (files: FileList | File[]) => {
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append('photos', f);
    return fetch('/api/upload', { method: 'POST', body: fd, headers: authHeaders() }).then((r) =>
      json<{ ingested: number }>(r)
    );
  },

  uploadBackground: (file: File) => {
    const fd = new FormData();
    fd.append('background', file);
    return fetch('/api/background', { method: 'POST', body: fd, headers: authHeaders() }).then(
      (r) => json<WallConfig>(r)
    );
  },

  uploadLogo: (file: File) => {
    const fd = new FormData();
    fd.append('logo', file);
    return fetch('/api/logo', { method: 'POST', body: fd, headers: authHeaders() }).then((r) =>
      json<WallConfig>(r)
    );
  },

  driveSyncNow: () =>
    fetch('/api/drive/sync', { method: 'POST', headers: authHeaders() }).then((r) =>
      json<{ lastSyncAt: number | null; lastError: string | null }>(r)
    ),

  getStatus: () =>
    fetch('/api/status', { headers: authHeaders() }).then((r) => json<ServerStatus>(r))
};

/** URL do telão: em dev o wall roda na porta 5173 do Vite; em produção é a raiz. */
export const WALL_URL = import.meta.env.DEV ? 'http://localhost:5173/' : '/';
