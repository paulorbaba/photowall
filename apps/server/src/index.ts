import fs from 'node:fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { ensureDirs, photosDir, backgroundsDir, wallDist, adminDist } from './paths.js';
import { ConfigStore } from './configStore.js';
import { PhotoStore } from './photoStore.js';
import { Ingestor } from './ingest.js';
import { DriveSync } from './drive.js';
import { createHub } from './hub.js';
import { registerRoutes } from './routes.js';
import { AdminAuth, registerAuth } from './auth.js';

const PORT = Number(process.env.PORT ?? 4700);
const VERSION = '2.0.0';

async function main() {
  ensureDirs();

  const app = Fastify({ logger: { level: 'info' } });
  const log = (msg: string) => app.log.info(msg);

  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 200 * 1024 * 1024 } });

  // Mídia (fotos aprovadas/pendentes e fundos)
  await app.register(fastifyStatic, { root: photosDir, prefix: '/media/photos/' });
  await app.register(fastifyStatic, {
    root: backgroundsDir,
    prefix: '/media/backgrounds/',
    decorateReply: false
  });

  // Builds de produção dos apps (em dev o Vite serve cada app na sua porta)
  if (fs.existsSync(wallDist)) {
    await app.register(fastifyStatic, { root: wallDist, prefix: '/', decorateReply: false });
  }
  if (fs.existsSync(adminDist)) {
    await app.register(fastifyStatic, { root: adminDist, prefix: '/admin/', decorateReply: false });
    app.get('/admin', (_req, reply) => reply.redirect('/admin/'));
  }

  const auth = new AdminAuth();
  registerAuth(app, auth);
  if (!auth.enabled) {
    app.log.warn('ADMIN_PASSWORD não definida — painel /admin SEM proteção por senha');
  }

  const config = new ConfigStore();
  const store = new PhotoStore();
  store.load();

  const hub = createHub(app.server);
  const ingestor = new Ingestor({
    store,
    getConfig: () => config.get(),
    notifyPhotos: () => hub.broadcast({ type: 'photos' }),
    log
  });
  const drive = new DriveSync(store, ingestor, () => config.get(), log);

  config.onChange = (cfg) => {
    hub.broadcast({ type: 'config', config: cfg });
    ingestor.syncWatcher();
    drive.apply();
  };

  registerRoutes(app, {
    config,
    store,
    ingestor,
    drive,
    hub,
    auth,
    startedAt: Date.now(),
    version: VERSION
  });

  ingestor.syncWatcher();
  drive.apply();

  await app.listen({ port: PORT, host: '0.0.0.0' });
  const publicUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${PORT}`;
  log(`Photo Wall v2 no ar em ${publicUrl}  (porta local ${PORT}) — painel em ${publicUrl}/admin/`);

  const shutdown = async () => {
    drive.stop();
    await ingestor.stop();
    hub.close();
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
