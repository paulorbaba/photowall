import fs from 'node:fs';
import path from 'node:path';
import type { Photo, PhotoStatus } from '@photowall/shared';
import { photosDir, registryFile } from './paths.js';

export class PhotoStore {
  private photos = new Map<string, Photo>();
  private saveTimer: NodeJS.Timeout | null = null;

  load(): void {
    try {
      const list: Photo[] = JSON.parse(fs.readFileSync(registryFile, 'utf-8'));
      for (const p of list) this.photos.set(p.id, p);
    } catch {
      // primeiro boot
    }
  }

  list(status?: PhotoStatus): Photo[] {
    const all = [...this.photos.values()].sort((a, b) => a.createdAt - b.createdAt);
    return status ? all.filter((p) => p.status === status) : all;
  }

  get(id: string): Photo | undefined {
    return this.photos.get(id);
  }

  add(photo: Photo): void {
    this.photos.set(photo.id, photo);
    this.scheduleSave();
  }

  setStatus(id: string, status: PhotoStatus): Photo | undefined {
    const p = this.photos.get(id);
    if (!p) return undefined;
    p.status = status;
    p.updatedAt = Date.now();
    this.scheduleSave();
    return p;
  }

  approveAllPending(): number {
    let count = 0;
    for (const p of this.photos.values()) {
      if (p.status === 'pending') {
        p.status = 'approved';
        p.updatedAt = Date.now();
        count++;
      }
    }
    if (count > 0) this.scheduleSave();
    return count;
  }

  remove(id: string): boolean {
    const p = this.photos.get(id);
    if (!p) return false;
    this.photos.delete(id);
    try {
      fs.unlinkSync(path.join(photosDir, p.file));
    } catch {
      // arquivo pode já ter sido removido manualmente
    }
    this.scheduleSave();
    return true;
  }

  /** Deduplicação de arquivos locais reprocessados após restart. */
  hasOriginal(originalName: string, size: number): boolean {
    for (const p of this.photos.values()) {
      if (p.originalName === originalName && p.size === size) return true;
    }
    return false;
  }

  hasDriveId(driveId: string): boolean {
    for (const p of this.photos.values()) {
      if (p.driveId === driveId) return true;
    }
    return false;
  }

  counts(): { pending: number; approved: number; rejected: number } {
    const c = { pending: 0, approved: 0, rejected: 0 };
    for (const p of this.photos.values()) c[p.status]++;
    return c;
  }

  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      const tmp = registryFile + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.list(), null, 2));
      fs.renameSync(tmp, registryFile);
    }, 300);
  }
}
