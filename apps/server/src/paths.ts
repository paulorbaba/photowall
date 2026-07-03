import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Raiz do repositório (apps/server/src|dist -> ../../..) */
export const repoRoot = path.resolve(here, '..', '..', '..');

/** Diretório de dados persistentes (fotos, config, fundos). */
export const dataDir = process.env.PHOTOWALL_DATA
  ? path.resolve(process.env.PHOTOWALL_DATA)
  : path.join(repoRoot, 'data');

export const photosDir = path.join(dataDir, 'photos');
export const backgroundsDir = path.join(dataDir, 'backgrounds');
export const configFile = path.join(dataDir, 'config.json');
export const registryFile = path.join(dataDir, 'photos.json');

export function ensureDirs(): void {
  for (const dir of [dataDir, photosDir, backgroundsDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Resolve a pasta de ingestão local: absoluta ou relativa ao diretório de dados. */
export function resolveIncoming(folder: string): string {
  return path.isAbsolute(folder) ? folder : path.join(dataDir, folder);
}

/** Diretórios dos builds dos apps web (servidos em produção). */
export const wallDist = path.resolve(here, '..', '..', 'wall', 'dist');
export const adminDist = path.resolve(here, '..', '..', 'admin', 'dist');
