import type { Server } from 'node:http';
import { WebSocketServer } from 'ws';
import type { ServerEvent } from '@photowall/shared';

/** Hub WebSocket: empurra config e novidades de fotos em tempo real para wall e admin. */
export function createHub(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  return {
    broadcast(event: ServerEvent): void {
      const json = JSON.stringify(event);
      for (const client of wss.clients) {
        if (client.readyState === client.OPEN) client.send(json);
      }
    },
    close(): void {
      wss.close();
    }
  };
}

export type Hub = ReturnType<typeof createHub>;
