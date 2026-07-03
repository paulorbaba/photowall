import type { CSSProperties } from 'react';
import type { EntryAnimation, FrameConfig, Photo } from '@photowall/shared';

export function frameStyle(f: FrameConfig): CSSProperties {
  return {
    padding: f.matte,
    background: f.matte > 0 ? f.matteColor : 'transparent',
    border: f.borderWidth > 0 ? `${f.borderWidth}px solid ${f.borderColor}` : 'none',
    borderRadius: f.borderRadius,
    boxShadow: f.shadow ? `0 6px 24px ${f.shadowColor}` : 'none'
  };
}

const CONCRETE: Exclude<EntryAnimation, 'random'>[] = ['fade', 'zoom', 'flip', 'slide', 'pop'];

export function resolveEntry(entry: EntryAnimation): Exclude<EntryAnimation, 'random'> {
  return entry === 'random' ? CONCRETE[Math.floor(Math.random() * CONCRETE.length)] : entry;
}

/** Direção aleatória de slide: a foto entra vinda de fora, de um dos 8 lados. */
export function randomSlideVars(): CSSProperties {
  const angle = Math.random() * Math.PI * 2;
  const dist = 220 + Math.random() * 240;
  return {
    '--dx': `${Math.round(Math.cos(angle) * dist)}px`,
    '--dy': `${Math.round(Math.sin(angle) * dist)}px`
  } as CSSProperties;
}

interface TileProps {
  photo: Photo | null;
  frame: FrameConfig;
  entry: Exclude<EntryAnimation, 'random'>;
  entryDuration: number;
  delayMs?: number;
  animKey: number | string;
  cellClassName?: string;
  cellStyle?: CSSProperties;
}

export function Tile({
  photo,
  frame,
  entry,
  entryDuration,
  delayMs = 0,
  animKey,
  cellClassName = '',
  cellStyle
}: TileProps) {
  if (!photo) return <div className={`cell ${cellClassName}`} style={cellStyle} />;
  return (
    <div className={`cell ${cellClassName}`} style={cellStyle}>
      <div
        key={animKey}
        className={`tile enter-${entry}`}
        style={{
          ...frameStyle(frame),
          ...randomSlideVars(),
          animationDuration: `${entryDuration}ms`,
          animationDelay: `${delayMs}ms`
        }}
      >
        <img src={`/media/photos/${photo.file}`} alt="" draggable={false} loading="lazy" />
      </div>
    </div>
  );
}
