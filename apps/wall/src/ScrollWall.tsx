import { useEffect, useMemo, useRef } from 'react';
import type { Photo, WallConfig } from '@photowall/shared';
import { alignPosition, frameStyle } from './tile';

/**
 * Modo "scroll automático": a parede rola verticalmente sem parar, em loop,
 * como um feed infinito de momentos do evento.
 */
export default function ScrollWall({ config, photos }: { config: WallConfig; photos: Photo[] }) {
  const { grid, frame, animation } = config;
  const innerRef = useRef<HTMLDivElement>(null);

  // Repete o acervo até preencher pelo menos ~2 telas para o loop ficar contínuo.
  const items = useMemo(() => {
    if (photos.length === 0) return [];
    const minItems = Math.max(photos.length, grid.cols * 8);
    const out: Photo[] = [];
    while (out.length < minItems) out.push(...photos);
    return out;
  }, [photos, grid.cols]);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    // Duração do loop = altura de uma cópia / velocidade configurada.
    const singleHeight = el.scrollHeight / 2;
    const duration = singleHeight / Math.max(5, animation.scrollSpeed);
    el.style.animationDuration = `${duration}s`;
  }, [items, animation.scrollSpeed, grid.cols, grid.gap]);

  const gridStyle = {
    gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
    gap: grid.gap,
    padding: `0 ${grid.padding}px`
  };

  const renderCopy = (copy: number) => (
    <div className="wall-grid scroll-grid" style={gridStyle} aria-hidden={copy === 1}>
      {items.map((photo, i) => (
        <div className="cell scroll-cell" key={`${copy}-${i}`}>
          <div className="tile" style={frameStyle(frame)}>
            <img
              src={`/media/photos/${photo.file}`}
              alt=""
              draggable={false}
              loading="lazy"
              style={{ objectPosition: alignPosition(photo.align ?? frame.photoAlign) }}
            />
          </div>
        </div>
      ))}
    </div>
  );

  if (items.length === 0) return null;

  return (
    <div className="scroll-wrap">
      <div className="scroll-inner" ref={innerRef}>
        {renderCopy(0)}
        {renderCopy(1)}
      </div>
    </div>
  );
}
