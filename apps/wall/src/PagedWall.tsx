import { useEffect, useMemo, useState } from 'react';
import type { Photo, WallConfig } from '@photowall/shared';
import { Tile, resolveEntry } from './tile';

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out.length ? out : [[]];
}

/**
 * Modo "paginado" (herdado da v1): páginas completas de fotos com crossfade,
 * agora com entrada animada por foto e ordem opcionalmente randomizada.
 */
export default function PagedWall({ config, photos }: { config: WallConfig; photos: Photo[] }) {
  const { grid, frame, animation } = config;
  const pageSize = grid.rows * grid.cols;
  const pages = useMemo(() => chunk(photos, pageSize), [photos, pageSize]);
  const [pageIdx, setPageIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);

  useEffect(() => {
    if (pageIdx >= pages.length) setPageIdx(0);
  }, [pages.length, pageIdx]);

  useEffect(() => {
    if (pages.length <= 1) return;
    const timer = setInterval(() => {
      setPageIdx((cur) => {
        setPrevIdx(cur);
        return (cur + 1) % pages.length;
      });
    }, animation.pageDuration);
    return () => clearInterval(timer);
  }, [pages.length, animation.pageDuration]);

  const gridStyle = {
    gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
    gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
    gap: grid.gap,
    padding: grid.padding
  };

  const renderPage = (idx: number, animated: boolean) => {
    const page = pages[idx] ?? [];
    const delays = page.map((_, i) =>
      animation.randomizeOrder ? Math.random() * 600 : i * 60
    );
    return (
      <div className="wall-grid page-layer" style={gridStyle}>
        {Array.from({ length: pageSize }, (_, i) => (
          <Tile
            key={i}
            photo={page[i] ?? null}
            frame={frame}
            entry={animated ? resolveEntry(animation.entry) : 'fade'}
            entryDuration={animated ? animation.entryDuration : 0}
            delayMs={animated ? delays[i] : 0}
            animKey={`${idx}-${i}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="paged-wrap">
      {prevIdx !== null && prevIdx !== pageIdx && (
        <div
          key={`out-${prevIdx}`}
          className="page-exit"
          style={{ animationDuration: `${animation.fadeDuration}ms` }}
        >
          {renderPage(prevIdx, false)}
        </div>
      )}
      <div
        key={`in-${pageIdx}`}
        className="page-enter"
        style={{ animationDuration: `${animation.fadeDuration}ms` }}
      >
        {renderPage(pageIdx, true)}
      </div>
    </div>
  );
}
