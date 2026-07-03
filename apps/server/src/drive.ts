import fs from 'node:fs';
import crypto from 'node:crypto';
import type { WallConfig } from '@photowall/shared';
import type { PhotoStore } from './photoStore.js';
import type { Ingestor } from './ingest.js';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

/**
 * Conector do Google Drive sem dependências pesadas: usa a API REST v3 via fetch.
 * Dois modos de autenticação:
 *  - apiKey: pasta pública ("qualquer pessoa com o link pode ver");
 *  - service account: pasta privada compartilhada com o e-mail da service account
 *    (JWT RS256 assinado com node:crypto, trocado por access token).
 */
export class DriveSync {
  private timer: NodeJS.Timeout | null = null;
  private token: { value: string; expiresAt: number } | null = null;
  private syncing = false;

  lastSyncAt: number | null = null;
  lastError: string | null = null;

  constructor(
    private store: PhotoStore,
    private ingestor: Ingestor,
    private getConfig: () => WallConfig,
    private log: (msg: string) => void
  ) {}

  /** Aplica a config atual: liga, desliga ou reagenda o polling. */
  apply(): void {
    const cfg = this.getConfig().sources.drive;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (!cfg.enabled || !cfg.folderId) return;
    this.timer = setInterval(() => void this.sync(), cfg.pollIntervalSec * 1000);
    void this.sync();
    this.log(`drive sync ativo (pasta ${cfg.folderId}, a cada ${cfg.pollIntervalSec}s)`);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async getAccessToken(keyFile: string): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;

    const key: ServiceAccountKey = JSON.parse(fs.readFileSync(keyFile, 'utf-8'));
    const tokenUri = key.token_uri ?? 'https://oauth2.googleapis.com/token';
    const now = Math.floor(Date.now() / 1000);
    const b64 = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const unsigned =
      b64({ alg: 'RS256', typ: 'JWT' }) +
      '.' +
      b64({
        iss: key.client_email,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        aud: tokenUri,
        iat: now,
        exp: now + 3600
      });
    const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(key.private_key);
    const jwt = unsigned + '.' + signature.toString('base64url');

    const res = await fetch(tokenUri, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });
    if (!res.ok) throw new Error(`token do Google falhou: HTTP ${res.status}`);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return data.access_token;
  }

  private async authParams(): Promise<{ query: string; headers: Record<string, string> }> {
    const cfg = this.getConfig().sources.drive;
    if (cfg.credentialsFile && fs.existsSync(cfg.credentialsFile)) {
      const token = await this.getAccessToken(cfg.credentialsFile);
      return { query: '', headers: { authorization: `Bearer ${token}` } };
    }
    if (cfg.apiKey) {
      return { query: `&key=${encodeURIComponent(cfg.apiKey)}`, headers: {} };
    }
    throw new Error('configure uma apiKey ou um arquivo de service account');
  }

  async sync(): Promise<void> {
    if (this.syncing) return;
    this.syncing = true;
    try {
      const cfg = this.getConfig().sources.drive;
      const { query, headers } = await this.authParams();
      const q = encodeURIComponent(`'${cfg.folderId}' in parents and trashed=false`);
      const url =
        `https://www.googleapis.com/drive/v3/files?q=${q}` +
        `&fields=files(id,name,mimeType)&pageSize=1000${query}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`listagem do Drive falhou: HTTP ${res.status}`);
      const data = (await res.json()) as { files: DriveFile[] };

      const images = data.files.filter((f) => f.mimeType.startsWith('image/'));
      for (const file of images) {
        if (this.store.hasDriveId(file.id)) continue;
        const dl = await fetch(
          `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media${query}`,
          { headers }
        );
        if (!dl.ok) {
          this.log(`drive: download de ${file.name} falhou (HTTP ${dl.status})`);
          continue;
        }
        const buf = Buffer.from(await dl.arrayBuffer());
        this.ingestor.ingestBuffer(buf, file.name, 'drive', { driveId: file.id });
      }
      this.lastSyncAt = Date.now();
      this.lastError = null;
    } catch (err) {
      // Falha de rede não pode derrubar o telão: registra e tenta no próximo ciclo.
      this.lastError = (err as Error).message;
      this.log(`drive sync: ${this.lastError}`);
    } finally {
      this.syncing = false;
    }
  }
}
