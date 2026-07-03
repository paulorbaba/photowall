import { useEffect, useState } from 'react';
import type { ServerStatus } from '@photowall/shared';
import { api, WALL_URL } from '../api';

export default function System() {
  const [status, setStatus] = useState<ServerStatus | null>(null);

  useEffect(() => {
    const load = () => api.getStatus().then(setStatus).catch(() => undefined);
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  if (!status) return <div className="section"><p className="muted">Carregando…</p></div>;

  const fmt = (ts: number | null) => (ts ? new Date(ts).toLocaleTimeString('pt-BR') : '—');

  return (
    <div className="section">
      <div className="section-head">
        <h2>Sistema</h2>
      </div>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-num">{status.counts.approved}</span>
          <span className="stat-label">no telão</span>
        </div>
        <div className="stat">
          <span className="stat-num">{status.counts.pending}</span>
          <span className="stat-label">na fila</span>
        </div>
        <div className="stat">
          <span className="stat-num">{status.counts.rejected}</span>
          <span className="stat-label">rejeitadas</span>
        </div>
        <div className="stat">
          <span className="stat-num">{Math.floor(status.uptimeSec / 60)}min</span>
          <span className="stat-label">no ar</span>
        </div>
      </div>

      <div className="card">
        <h3>Detalhes</h3>
        <table className="info-table">
          <tbody>
            <tr>
              <td>Versão</td>
              <td>{status.version}</td>
            </tr>
            <tr>
              <td>Pasta de dados</td>
              <td>{status.dataDir}</td>
            </tr>
            <tr>
              <td>Pasta observada</td>
              <td>
                {status.watcher.folder} {status.watcher.active ? '● ativa' : '○ inativa'}
              </td>
            </tr>
            <tr>
              <td>Google Drive</td>
              <td>
                {status.drive.enabled
                  ? `ativo — última sync: ${fmt(status.drive.lastSyncAt)}${status.drive.lastError ? ` (erro: ${status.drive.lastError})` : ''}`
                  : 'desativado'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Telão</h3>
        <p className="muted">
          Abra o telão na máquina conectada à TV/projetor e coloque em tela cheia (F11), ou use os
          scripts de kiosk incluídos no projeto para abrir automaticamente na posição certa.
        </p>
        <a className="btn btn-neutral" href={WALL_URL} target="_blank" rel="noreferrer">
          ↗ Abrir telão
        </a>
      </div>
    </div>
  );
}
