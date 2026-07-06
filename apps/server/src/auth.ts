import crypto from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';

/**
 * Autenticação mínima do painel: senha única via env ADMIN_PASSWORD.
 * Login troca a senha por um token de sessão em memória (expira em 24h),
 * enviado pelo admin no header x-admin-token. Sem ADMIN_PASSWORD definida,
 * a auth fica desativada (modo aberto, útil em dev/teste local).
 */
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export class AdminAuth {
  private password = process.env.ADMIN_PASSWORD ?? '';
  private sessions = new Map<string, number>(); // token -> expiresAt

  get enabled(): boolean {
    return this.password.length > 0;
  }

  login(candidate: string): string | null {
    if (!this.enabled) return null;
    const a = Buffer.from(String(candidate));
    const b = Buffer.from(this.password);
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!ok) return null;
    const token = crypto.randomBytes(32).toString('hex');
    this.sessions.set(token, Date.now() + SESSION_TTL_MS);
    return token;
  }

  validate(token: string | undefined): boolean {
    if (!this.enabled) return true;
    if (!token) return false;
    const expiresAt = this.sessions.get(token);
    if (!expiresAt) return false;
    if (expiresAt < Date.now()) {
      this.sessions.delete(token);
      return false;
    }
    return true;
  }
}

/** Rotas que o telão e os convidados usam sem login. */
function isPublic(req: FastifyRequest): boolean {
  const url = req.url.split('?')[0];
  if (!url.startsWith('/api/')) return true; // estáticos, /media, /ws, /upload
  if (req.method === 'POST' && url === '/api/login') return true;
  if (req.method === 'POST' && url === '/api/guest-upload') return true;
  if (req.method === 'GET' && url === '/api/config') return true;
  if (req.method === 'GET' && url === '/api/photos') {
    return (req.query as { status?: string }).status === 'approved';
  }
  return false;
}

export function registerAuth(app: FastifyInstance, auth: AdminAuth): void {
  app.post('/api/login', async (req, reply) => {
    if (!auth.enabled) return { token: null, authEnabled: false };
    const { password } = (req.body ?? {}) as { password?: string };
    const token = auth.login(password ?? '');
    if (!token) return reply.code(401).send({ error: 'senha incorreta' });
    return { token, authEnabled: true };
  });

  app.addHook('onRequest', async (req, reply) => {
    if (!auth.enabled || isPublic(req)) return;
    const token = req.headers['x-admin-token'];
    if (!auth.validate(typeof token === 'string' ? token : undefined)) {
      return reply.code(401).send({ error: 'não autorizado' });
    }
  });
}
