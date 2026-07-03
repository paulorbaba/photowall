import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import chokidar, { type FSWatcher } from 'chokidar';
import { isSupportedImage, type Photo, type PhotoSource, type WallConfig } from '@photowall/shared';
import { photosDir, resolveIncoming } from './paths.js';
import type { PhotoStore } from './photoStore.js';

export interface IngestDeps {
  store: PhotoStore;
  getConfig: () => WallConfig;
  notifyPhotos: () => void;
  log: (msg: string) => void;
}

export class Ingestor {
  private watcher: FSWatcher | null = null;
  private watchedFolder = '';

  constructor(private deps: IngestDeps) {}

  get activeFolder(): string {
    return this.watchedFolder;
  }

  get watcherActive(): boolean {
    return this.watcher !== null;
  }

  /** Registra um buffer de imagem no cache e na fila de moderação. */
  ingestBuffer(
    buf: Buffer,
    originalName: string,
    source: PhotoSource,
    opts: { driveId?: string; forceApprove?: boolean } = {}
  ): Photo | null {
    if (!isSupportedImage(originalName)) return null;
    const ext = path.extname(originalName).toLowerCase();
    const id = crypto.randomUUID();
    const file = `${id}${ext}`;
    fs.writeFileSync(path.join(photosDir, file), buf);

    const autoApprove = opts.forceApprove || this.deps.getConfig().sources.autoApprove;
    const now = Date.now();
    const photo: Photo = {
      id,
      file,
      originalName,
      source,
      driveId: opts.driveId,
      size: buf.length,
      status: autoApprove ? 'approved' : 'pending',
      createdAt: now,
      updatedAt: now
    };
    this.deps.store.add(photo);
    this.deps.notifyPhotos();
    this.deps.log(`foto ingerida: ${originalName} (${source}, ${photo.status})`);
    return photo;
  }

  private ingestLocalFile(filePath: string): void {
    try {
      const name = path.basename(filePath);
      if (!isSupportedImage(name)) return;
      const stat = fs.statSync(filePath);
      if (this.deps.store.hasOriginal(name, stat.size)) return;
      const buf = fs.readFileSync(filePath);
      this.ingestBuffer(buf, name, 'local');
    } catch (err) {
      this.deps.log(`erro ao ingerir ${filePath}: ${(err as Error).message}`);
    }
  }

  /** (Re)inicia o watcher da pasta local. Chamado no boot e quando a config muda. */
  syncWatcher(): void {
    const folder = resolveIncoming(this.deps.getConfig().sources.localFolder);
    if (folder === this.watchedFolder && this.watcher) return;

    void this.watcher?.close();
    this.watcher = null;
    fs.mkdirSync(folder, { recursive: true });
    this.watchedFolder = folder;

    this.watcher = chokidar.watch(folder, {
      ignoreInitial: false,
      depth: 1,
      awaitWriteFinish: { stabilityThreshold: 800, pollInterval: 150 }
    });
    this.watcher.on('add', (filePath) => this.ingestLocalFile(filePath));
    this.watcher.on('error', (err) => this.deps.log(`watcher: ${(err as Error).message}`));
    this.deps.log(`observando pasta local: ${folder}`);
  }

  async stop(): Promise<void> {
    await this.watcher?.close();
    this.watcher = null;
  }
}
