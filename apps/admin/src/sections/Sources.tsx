import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { WallConfig } from '@photowall/shared';
import { api } from '../api';
import { NumberField, TextField, Toggle } from '../controls';

/** Em dev o server roda em :4700; em produção a página /upload é a mesma origem. */
const UPLOAD_URL = import.meta.env.DEV
  ? 'http://localhost:4700/upload'
  : `${location.origin}/upload`;

function GuestUploadCard() {
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(UPLOAD_URL, {
      width: 480,
      margin: 1,
      color: { dark: '#0f1117', light: '#ffffff' }
    })
      .then(setQr)
      .catch(() => undefined);
  }, []);

  const copy = () => {
    navigator.clipboard?.writeText(UPLOAD_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="card guest-card">
      <h3>📱 Upload pelos convidados (recomendado)</h3>
      <div className="guest-grid">
        <div>
          <p className="muted" style={{ marginBottom: 12, lineHeight: 1.55 }}>
            Compartilhe o link ou projete o QR code no evento: o convidado escaneia com a câmera
            do celular, tira a foto ou escolhe da galeria e envia. A foto cai direto na fila de
            moderação — sem conta Google, sem instalar nada.
          </p>
          <div className="row-inline" style={{ marginBottom: 10 }}>
            <code className="upload-link">{UPLOAD_URL}</code>
          </div>
          <div className="row-inline">
            <button className="btn btn-neutral" onClick={copy}>
              {copied ? '✓ Copiado' : 'Copiar link'}
            </button>
            <a className="btn btn-neutral" href={UPLOAD_URL} target="_blank" rel="noreferrer">
              ↗ Abrir página
            </a>
            {qr && (
              <a className="btn btn-neutral" href={qr} download="qr-photo-wall.png">
                ⬇ Baixar QR
              </a>
            )}
          </div>
        </div>
        {qr && (
          <div className="qr-box">
            <img src={qr} alt="QR code da página de upload" />
          </div>
        )}
      </div>
    </div>
  );
}

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

      <GuestUploadCard />

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
        <h3>Google Drive (alternativa avançada)</h3>
        <p className="muted" style={{ marginBottom: 12, fontSize: 12.5, lineHeight: 1.5 }}>
          Requer configuração no Google Cloud (chave de API ou service account) — o Google não
          oferece acesso confiável a pastas compartilhadas sem API. Para a maioria dos eventos, o
          upload pelos convidados acima é mais simples.
        </p>
        <Toggle
          label="Sincronizar com uma pasta do Google Drive"
          hint="fotos da pasta compartilhada entram na fila automaticamente"
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
