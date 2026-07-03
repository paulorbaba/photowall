import { useState } from 'react';
import { useConfig, usePhotos } from './useAdmin';
import Moderation from './sections/Moderation';
import Appearance from './sections/Appearance';
import GridAnimation from './sections/GridAnimation';
import Sources from './sections/Sources';
import System from './sections/System';

type Tab = 'moderation' | 'appearance' | 'grid' | 'sources' | 'system';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'moderation', label: 'Moderação', icon: '🛡️' },
  { id: 'appearance', label: 'Aparência', icon: '🎨' },
  { id: 'grid', label: 'Grid & Animação', icon: '🎞️' },
  { id: 'sources', label: 'Fontes de fotos', icon: '📥' },
  { id: 'system', label: 'Sistema', icon: '⚙️' }
];

export default function App() {
  const { config, update, saving, acceptRemote, setConfig } = useConfig();
  const { photos, refresh } = usePhotos(acceptRemote);
  const [tab, setTab] = useState<Tab>('moderation');

  const pendingCount = photos.filter((p) => p.status === 'pending').length;

  if (!config) {
    return (
      <div className="admin-root">
        <p className="muted" style={{ padding: 40 }}>
          Conectando ao servidor…
        </p>
      </div>
    );
  }

  return (
    <div className="admin-root">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-dot" />
          <div>
            <strong>Photo Wall</strong>
            <span className="brand-sub">painel do evento</span>
          </div>
        </div>
        <nav>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`nav-item ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="nav-icon">{t.icon}</span>
              {t.label}
              {t.id === 'moderation' && pendingCount > 0 && (
                <span className="nav-badge">{pendingCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="save-state">{saving ? 'Salvando…' : 'Alterações salvas ✓'}</div>
      </aside>

      <main className="content">
        {tab === 'moderation' && (
          <Moderation photos={photos} refresh={refresh} config={config} update={update} />
        )}
        {tab === 'appearance' && <Appearance config={config} update={update} setConfig={setConfig} />}
        {tab === 'grid' && <GridAnimation config={config} update={update} />}
        {tab === 'sources' && <Sources config={config} update={update} />}
        {tab === 'system' && <System />}
      </main>
    </div>
  );
}
