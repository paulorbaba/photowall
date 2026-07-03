import type { Photo, PhotoStatus, ServerStatus, WallConfig } from '@photowall/shared';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  getConfig: () => fetch('/api/config').then((r) => json<WallConfig>(r)),

  putConfig: (patch: unknown) =>
    fetch('/api/config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch)
    }).then((r) => json<WallConfig>(r)),

  getPhotos: (status?: PhotoStatus) =>
    fetch(`/api/photos${status ? `?status=${status}` : ''}`).then((r) => json<Photo[]>(r)),

  setStatus: (id: string, status: PhotoStatus) =>
    fetch(`/api/photos/${id}/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status })
    }).then((r) => json<Photo>(r)),

  approveAll: () =>
    fetch('/api/photos/approve-all', { method: 'POST' }).then((r) => json<{ approved: number }>(r)),

  deletePhoto: (id: string) =>
    fetch(`/api/photos/${id}`, { method: 'DELETE' }).then((r) => json<{ ok: boolean }>(r)),

  uploadPhotos: (files: FileList | File[]) => {
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append('photos', f);
    return fetch('/api/upload', { method: 'POST', body: fd }).then((r) =>
      json<{ ingested: number }>(r)
    );
  },

  uploadBackground: (file: File) => {
    const fd = new FormData();
    fd.append('background', file);
    return fetch('/api/background', { method: 'POST', body: fd }).then((r) => json<WallConfig>(r));
  },

  driveSyncNow: () =>
    fetch('/api/drive/sync', { method: 'POST' }).then((r) =>
      json<{ lastSyncAt: number | null; lastError: string | null }>(r)
    ),

  getStatus: () => fetch('/api/status').then((r) => json<ServerStatus>(r))
};

/** URL do telão: em dev o wall roda na porta 5173 do Vite; em produção é a raiz. */
export const WALL_URL = import.meta.env.DEV ? 'http://localhost:5173/' : '/';
