import { useEffect, useRef, useState } from 'react';
import type { Photo, ServerEvent, WallConfig } from '@photowall/shared';

/** Estado do telão: config + fotos aprovadas, atualizados em tempo real via WebSocket. */
export function useWallData() {
  const [config, setConfig] = useState<WallConfig | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let alive = true;

    const fetchConfig = () =>
      fetch('/api/config')
        .then((r) => r.json())
        .then((c) => alive && setConfig(c))
        .catch(() => undefined);

    const fetchPhotos = () =>
      fetch('/api/photos?status=approved')
        .then((r) => r.json())
        .then((p) => alive && setPhotos(p))
        .catch(() => undefined);

    fetchConfig();
    fetchPhotos();

    let retry = 0;
    const connect = () => {
      if (!alive) return;
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${location.host}/ws`);
      wsRef.current = ws;
      ws.onopen = () => {
        retry = 0;
        // Ressincroniza após reconexão: pode ter perdido eventos.
        fetchConfig();
        fetchPhotos();
      };
      ws.onmessage = (msg) => {
        try {
          const event: ServerEvent = JSON.parse(msg.data);
          if (event.type === 'config') setConfig(event.config);
          if (event.type === 'photos') fetchPhotos();
        } catch {
          // mensagem malformada: ignora
        }
      };
      ws.onclose = () => {
        if (!alive) return;
        retry++;
        setTimeout(connect, Math.min(10000, 500 * 2 ** retry));
      };
    };
    connect();

    return () => {
      alive = false;
      wsRef.current?.close();
    };
  }, []);

  return { config, photos };
}
