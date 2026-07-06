import { useEffect, useRef, useState } from 'react';
import type { ServerStatus, WallConfig } from '@photowall/shared';
import { api, WALL_URL } from '../api';

export default function System({ config }: { config: WallConfig }) {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [importMsg, setImportMsg] = useState('');
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = () => api.getStatus().then(setStatus).catch(() => undefined);
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  if (!status) return <div className="section"><p className="muted">Carregando…</p></div>;

  const fmt = (ts: number | null) => (ts ? new Date(ts).toLocaleTimeString('pt-BR') : '—');

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `photowall-preset-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importConfig = (file: File) => {
    file
      .text()
      .then((text) => api.putConfig(JSON.parse(text)))
      .then(() => setImportMsg('Configuração importada — o telão já foi atualizado.'))
      .catch(() => setImportMsg('Erro: arquivo inválido ou rejeitado pelo servidor.'));
  };

  return (
    <div className="section">
      <div className="section-head">
        <h2>Sistema</h2>
      </div>

      {!status.authEnabled && (
        <div className="card warn-card">
          <h3>⚠️ Painel sem senha</h3>
          <p className="muted">
            A variável de ambiente <code>ADMIN_PASSWORD</code> não está configurada no servidor —
            qualquer pessoa com o link deste painel pode alterar tudo. Em produção (Railway:
            Variables → New Variable), defina <code>ADMIN_PASSWORD</code> e reinicie o serviço.
          </p>
        </div>
      )}

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
        <h3>Preset do evento</h3>
        <p className="muted" style={{ marginBottom: 12, lineHeight: 1.5 }}>
          Exporte a configuração deste evento (grid, cores, moldura, título, logo, animações)
          como um arquivo de preset e importe em outra instância para reaproveitar o visual em um
          próximo evento.
        </p>
        <div className="row-inline">
          <button className="btn btn-neutral" onClick={exportConfig}>
            ⬇ Exportar configuração
          </button>
          <button className="btn btn-neutral" onClick={() => importInput.current?.click()}>
            ⬆ Importar configuração
          </button>
          <input
            ref={importInput}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importConfig(file);
              e.target.value = '';
            }}
          />
          {importMsg && <span className="muted">{importMsg}</span>}
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
              <td>Segurança do painel</td>
              <td>{status.authEnabled ? '🔒 protegido por senha' : '⚠️ aberto (sem senha)'}</td>
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
