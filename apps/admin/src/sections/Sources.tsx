import { useState } from 'react';
import type { WallConfig } from '@photowall/shared';
import { api } from '../api';
import { NumberField, TextField, Toggle } from '../controls';

export default function Sources({
  config,
  update
}: {
  config: WallConfig;
  update: (path: string, value: unknown) => void;
}) {
  const { sources } = config;
  const [syncMsg, setSyncMsg] = useState('');

  const syncNow = () => {
    setSyncMsg('Sincronizando…');
    api
      .driveSyncNow()
      .then((r) => setSyncMsg(r.lastError ? `Erro: ${r.lastError}` : 'Sincronizado com sucesso.'))
      .catch((e) => setSyncMsg(`Erro: ${(e as Error).message}`));
  };

  return (
    <div className="section">
      <div className="section-head">
        <h2>Fontes de fotos</h2>
      </div>

      <div className="card">
        <h3>Pasta local</h3>
        <TextField
          label="Pasta observada"
          value={sources.localFolder}
          onChange={(v) => update('sources.localFolder', v)}
          hint="Caminho absoluto ou relativo à pasta de dados. Toda imagem salva aqui entra na fila automaticamente."
        />
      </div>

      <div className="card">
        <h3>Google Drive</h3>
        <Toggle
          label="Sincronizar com uma pasta do Google Drive"
          hint="convidados enviam fotos pelo celular direto na pasta compartilhada"
          checked={sources.drive.enabled}
          onChange={(v) => update('sources.drive.enabled', v)}
        />
        {sources.drive.enabled && (
          <>
            <TextField
              label="ID da pasta do Drive"
              value={sources.drive.folderId}
              placeholder="ex.: 1AbC2dEfG3hIjK4LmNoP"
              onChange={(v) => update('sources.drive.folderId', v)}
              hint="É o trecho final da URL da pasta: drive.google.com/drive/folders/‹ID›"
            />
            <TextField
              label="Chave de API (pasta pública)"
              value={sources.drive.apiKey}
              onChange={(v) => update('sources.drive.apiKey', v)}
              hint="Para pastas com acesso 'qualquer pessoa com o link'. Crie em console.cloud.google.com → APIs → Credenciais."
            />
            <TextField
              label="Arquivo de service account (pasta privada)"
              value={sources.drive.credentialsFile}
              placeholder="/caminho/para/service-account.json"
              onChange={(v) => update('sources.drive.credentialsFile', v)}
              hint="Alternativa para pastas privadas: compartilhe a pasta com o e-mail da service account. Tem prioridade sobre a chave de API."
            />
            <NumberField
              label="Intervalo de sincronização (segundos)"
              value={sources.drive.pollIntervalSec}
              min={5}
              max={3600}
              onChange={(v) => update('sources.drive.pollIntervalSec', v)}
            />
            <div className="row-inline">
              <button className="btn btn-neutral" onClick={syncNow}>
                ⟳ Sincronizar agora
              </button>
              {syncMsg && <span className="muted">{syncMsg}</span>}
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h3>Como funciona o fluxo</h3>
        <ol className="muted flow-list">
          <li>Fotos chegam pela pasta local, pelo Google Drive ou por upload neste painel.</li>
          <li>Cada foto é copiada para o cache local do sistema — o telão nunca depende da internet.</li>
          <li>Com a moderação ativa, a foto aguarda aprovação na aba Moderação antes de aparecer.</li>
          <li>Ao ser aprovada, a foto estreia no telão em tempo real, com a animação configurada.</li>
        </ol>
      </div>
    </div>
  );
}
