import { useCallback, useEffect, useRef, useState } from 'react';
import type { Photo, ServerEvent, WallConfig } from '@photowall/shared';
import { api } from './api';

/** Atribui um valor num caminho "a.b.c" retornando um novo objeto (imutável). */
export function setPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.');
  const clone: any = { ...(obj as any) };
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] = { ...cur[keys[i]] };
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  return clone;
}

/** Config com salvamento automático (debounce) e sync via WebSocket. */
export function useConfig() {
  const [config, setConfig] = useState<WallConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const pendingSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => undefined);
  }, []);

  const update = useCallback((path: string, value: unknown) => {
    dirty.current = true;
    setConfig((cur) => {
      if (!cur) return cur;
      const next = setPath(cur, path, value);
      if (pendingSave.current) clearTimeout(pendingSave.current);
      pendingSave.current = setTimeout(() => {
        setSaving(true);
        api
          .putConfig(next)
          .then((saved) => {
            dirty.current = false;
            setConfig(saved);
          })
          .catch(() => undefined)
          .finally(() => setSaving(false));
      }, 500);
      return next;
    });
  }, []);

  /** Aceita config vinda do servidor (WS), exceto se há edição local pendente. */
  const acceptRemote = useCallback((cfg: WallConfig) => {
    if (!dirty.current) setConfig(cfg);
  }, []);

  return { config, update, saving, acceptRemote, setConfig };
}

/** Lista de fotos, recarregada quando o servidor emite eventos. */
export function usePhotos(onRemoteConfig: (cfg: WallConfig) => void) {
  const [photos, setPhotos] = useState<Photo[]>([]);

  const refresh = useCallback(() => {
    api.getPhotos().then(setPhotos).catch(() => undefined);
  }, []);

  useEffect(() => {
    refresh();
    let alive = true;
    let retry = 0;
    let ws: WebSocket | null = null;

    const connect = () => {
      if (!alive) return;
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}/ws`);
      ws.onopen = () => {
        retry = 0;
        refresh();
      };
      ws.onmessage = (msg) => {
        try {
          const event: ServerEvent = JSON.parse(msg.data);
          if (event.type === 'photos') refresh();
          if (event.type === 'config') onRemoteConfig(event.config);
        } catch {
          // ignora
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
      ws?.close();
    };
  }, [refresh, onRemoteConfig]);

  return { photos, refresh };
}
