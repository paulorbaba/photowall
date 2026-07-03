import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Photo, WallConfig } from '@photowall/shared';
import { Tile, resolveEntry } from './tile';

interface Cell {
  photo: Photo | null;
  /** Muda a cada troca para reiniciar a animação de entrada */
  key: number;
  entry: ReturnType<typeof resolveEntry>;
  delayMs: number;
}

/**
 * Modo "mosaico vivo": cada célula troca de foto de forma independente e
 * aleatória — fotos novas entram na hora em posições sorteadas.
 */
export default function MosaicWall({ config, photos }: { config: WallConfig; photos: Photo[] }) {
  const { grid, frame, animation } = config;
  const count = grid.rows * grid.cols;
  const [cells, setCells] = useState<Cell[]>([]);
  const keyCounter = useRef(0);
  const knownIds = useRef<Set<string>>(new Set());
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const pickPhoto = (exclude: string | undefined): Photo | null => {
    const pool = photosRef.current;
    if (pool.length === 0) return null;
    if (pool.length === 1) return pool[0];
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = pool[Math.floor(Math.random() * pool.length)];
      if (candidate.id !== exclude) return candidate;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // Monta/redimensiona o mosaico quando o grid ou o primeiro lote de fotos chega.
  useEffect(() => {
    setCells((prev) => {
      const next: Cell[] = [];
      for (let i = 0; i < count; i++) {
        const existing = prev[i];
        if (existing?.photo && photos.some((p) => p.id === existing.photo!.id)) {
          next.push(existing);
        } else {
          next.push({
            photo: photos.length ? photos[i % photos.length] : null,
            key: keyCounter.current++,
            entry: resolveEntry(animation.entry),
            delayMs: animation.randomizeOrder ? Math.random() * 1400 : (i % count) * 40
          });
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, photos.length === 0]);

  // Fotos recém-aprovadas estreiam imediatamente em células sorteadas.
  useEffect(() => {
    const isFirstLoad = knownIds.current.size === 0;
    const fresh = photos.filter((p) => !knownIds.current.has(p.id));
    knownIds.current = new Set(photos.map((p) => p.id));
    // No primeiro lote o grid inteiro já entra em cascata; a estreia célula a
    // célula vale só para fotos aprovadas com o telão no ar.
    if (isFirstLoad || fresh.length === 0 || count === 0) return;
    setCells((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      for (let i = 0; i < fresh.length; i++) {
        const cellIdx = Math.floor(Math.random() * next.length);
        next[cellIdx] = {
          photo: fresh[i],
          key: keyCounter.current++,
          entry: resolveEntry(animation.entry),
          delayMs: i * 350
        };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  // Rotação orgânica: a cada swapInterval uma célula aleatória troca de foto.
  useEffect(() => {
    if (photos.length === 0) return;
    const timer = setInterval(() => {
      setCells((prev) => {
        if (prev.length === 0) return prev;
        const idx = Math.floor(Math.random() * prev.length);
        const next = [...prev];
        next[idx] = {
          photo: pickPhoto(prev[idx].photo?.id),
          key: keyCounter.current++,
          entry: resolveEntry(animation.entry),
          delayMs: 0
        };
        return next;
      });
    }, animation.swapInterval);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animation.swapInterval, animation.entry, photos.length > 0]);

  // Deriva parallax: vetores estáveis por célula (não mudam a cada render).
  const driftVars = useMemo<CSSProperties[]>(() => {
    return Array.from({ length: count }, () => {
      const amp = animation.parallaxIntensity;
      return {
        '--ax': `${(Math.random() * 2 - 1) * amp}px`,
        '--ay': `${(Math.random() * 2 - 1) * amp}px`,
        '--drift-dur': `${6 + Math.random() * 8}s`
      } as CSSProperties;
    });
  }, [count, animation.parallaxIntensity]);

  return (
    <div
      className="wall-grid"
      style={{
        gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
        gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
        gap: grid.gap,
        padding: grid.padding
      }}
    >
      {cells.map((cell, i) => (
        <Tile
          key={i}
          photo={cell.photo}
          frame={frame}
          entry={cell.entry}
          entryDuration={animation.entryDuration}
          delayMs={cell.delayMs}
          animKey={cell.key}
          cellClassName={animation.parallax ? 'drift' : ''}
          cellStyle={animation.parallax ? driftVars[i] : undefined}
        />
      ))}
    </div>
  );
}
