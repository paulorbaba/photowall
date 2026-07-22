import type { CSSProperties } from 'react';
import type { BackgroundConfig, TitleConfig } from '@photowall/shared';
import { useWallData } from './useWallData';
import MosaicWall from './MosaicWall';
import PagedWall from './PagedWall';
import ScrollWall from './ScrollWall';

function Background({ bg }: { bg: BackgroundConfig }) {
  return (
    <div className="bg-layer" style={{ background: bg.color }}>
      {bg.type === 'image' && bg.file && (
        <img className="bg-media" src={bg.file} alt="" draggable={false} />
      )}
      {bg.type === 'video' && bg.file && (
        <video className="bg-media" src={bg.file} autoPlay loop muted playsInline />
      )}
      {bg.overlayOpacity > 0 && (
        <div
          className="bg-overlay"
          style={{ background: bg.overlayColor, opacity: bg.overlayOpacity }}
        />
      )}
    </div>
  );
}

function Title({ title }: { title: TitleConfig }) {
  if (!title.enabled) return null;

  // Âncora horizontal: left/right prendem numa borda; center fica livre no
  // meio e o offset desloca lateralmente via transform (não afeta a largura).
  const blockStyle: CSSProperties = {
    color: title.color,
    top: `${title.offsetY}vh`,
    textAlign: title.alignH,
    alignItems: title.alignH === 'left' ? 'flex-start' : title.alignH === 'right' ? 'flex-end' : 'center',
    '--title-size': `${title.titleSize}vh`,
    '--subtitle-size': `${title.subtitleSize}vh`
  } as CSSProperties;

  if (title.alignH === 'left') {
    blockStyle.left = `${title.offsetX}vw`;
    blockStyle.right = 'auto';
  } else if (title.alignH === 'right') {
    blockStyle.right = `${title.offsetX}vw`;
    blockStyle.left = 'auto';
  } else {
    blockStyle.left = 0;
    blockStyle.right = 0;
    blockStyle.transform = `translateX(${title.offsetX}vw)`;
  }

  return (
    <div className="wall-title" style={blockStyle}>
      {title.logoFile && (
        <img
          className="wall-logo"
          src={title.logoFile}
          alt=""
          style={{ height: `${title.logoSize}vh` }}
          draggable={false}
        />
      )}
      <h1>{title.text}</h1>
      {title.subtitle && <p>{title.subtitle}</p>}
    </div>
  );
}

export default function App() {
  const { config, photos } = useWallData();

  if (!config) {
    return <div className="wall-root" style={{ background: '#000' }} />;
  }

  const { animation } = config;

  return (
    <div className="wall-root">
      <Background bg={config.background} />
      <Title title={config.title} />
      <div
        className="wall-area"
        style={{ top: config.title.enabled ? `${config.title.gridGap}vh` : 0 }}
      >
        {photos.length === 0 ? (
          <div className="empty-state">
            <div className="pulse" />
            <p>Aguardando as primeiras fotos…</p>
          </div>
        ) : animation.mode === 'paged' ? (
          <PagedWall config={config} photos={photos} />
        ) : animation.mode === 'scroll' ? (
          <ScrollWall config={config} photos={photos} />
        ) : (
          <MosaicWall config={config} photos={photos} />
        )}
      </div>
    </div>
  );
}
