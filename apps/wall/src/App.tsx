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
  return (
    <div className="wall-title" style={{ color: title.color }}>
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
        style={{
          top: config.title.enabled
            ? `${12 + (config.title.logoFile ? config.title.logoSize + 1 : 0)}vh`
            : 0
        }}
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
