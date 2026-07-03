import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { PhotoStatus, ServerStatus } from '@photowall/shared';
import { backgroundsDir, dataDir } from './paths.js';
import type { ConfigStore } from './configStore.js';
import type { PhotoStore } from './photoStore.js';
import type { Ingestor } from './ingest.js';
import type { DriveSync } from './drive.js';
import type { Hub } from './hub.js';

export interface RouteDeps {
  config: ConfigStore;
  store: PhotoStore;
  ingestor: Ingestor;
  drive: DriveSync;
  hub: Hub;
  startedAt: number;
  version: string;
}

const VALID_STATUS: PhotoStatus[] = ['pending', 'approved', 'rejected'];

export function registerRoutes(app: FastifyInstance, deps: RouteDeps): void {
  const { config, store, ingestor, drive, hub } = deps;

  app.get('/api/config', async () => config.get());

  app.put('/api/config', async (req) => {
    const updated = config.update(req.body);
    return updated;
  });

  app.get('/api/photos', async (req) => {
    const { status } = req.query as { status?: string };
    if (status && !VALID_STATUS.includes(status as PhotoStatus)) {
      return { error: 'status inválido' };
    }
    return store.list(status as PhotoStatus | undefined);
  });

  app.post('/api/photos/:id/status', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: PhotoStatus };
    if (!VALID_STATUS.includes(status)) {
      return reply.code(400).send({ error: 'status inválido' });
    }
    const photo = store.setStatus(id, status);
    if (!photo) return reply.code(404).send({ error: 'foto não encontrada' });
    hub.broadcast({ type: 'photos' });
    return photo;
  });

  app.post('/api/photos/approve-all', async () => {
    const count = store.approveAllPending();
    if (count > 0) hub.broadcast({ type: 'photos' });
    return { approved: count };
  });

  app.delete('/api/photos/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!store.remove(id)) return reply.code(404).send({ error: 'foto não encontrada' });
    hub.broadcast({ type: 'photos' });
    return { ok: true };
  });

  // Upload manual de fotos pelo painel (já entram aprovadas: o operador é confiável).
  app.post('/api/upload', async (req) => {
    const results: string[] = [];
    for await (const part of req.parts()) {
      if (part.type !== 'file') continue;
      const buf = await part.toBuffer();
      const photo = ingestor.ingestBuffer(buf, part.filename ?? 'upload.jpg', 'upload', {
        forceApprove: true
      });
      if (photo) results.push(photo.id);
    }
    return { ingested: results.length, ids: results };
  });

  // Upload de imagem/vídeo de fundo; atualiza a config e avisa o telão.
  app.post('/api/background', async (req, reply) => {
    const part = await req.file();
    if (!part) return reply.code(400).send({ error: 'nenhum arquivo enviado' });
    const buf = await part.toBuffer();
    const ext = path.extname(part.filename ?? '').toLowerCase() || '.bin';
    const isVideo = (part.mimetype ?? '').startsWith('video/');
    const name = `bg-${Date.now()}${ext}`;
    fs.writeFileSync(path.join(backgroundsDir, name), buf);

    const updated = config.update({
      background: { type: isVideo ? 'video' : 'image', file: `/media/backgrounds/${name}` }
    });
    return updated;
  });

  app.post('/api/drive/sync', async () => {
    await drive.sync();
    return { lastSyncAt: drive.lastSyncAt, lastError: drive.lastError };
  });

  app.get('/api/status', async (): Promise<ServerStatus> => {
    return {
      version: deps.version,
      uptimeSec: Math.round((Date.now() - deps.startedAt) / 1000),
      counts: store.counts(),
      watcher: { folder: ingestor.activeFolder, active: ingestor.watcherActive },
      drive: {
        enabled: config.get().sources.drive.enabled,
        lastSyncAt: drive.lastSyncAt,
        lastError: drive.lastError
      },
      dataDir
    };
  });
}
