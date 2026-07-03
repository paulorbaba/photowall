import { useRef } from 'react';
import type { Photo, WallConfig } from '@photowall/shared';
import { api } from '../api';
import { Toggle } from '../controls';

function PhotoCard({
  photo,
  actions
}: {
  photo: Photo;
  actions: { label: string; kind: 'ok' | 'danger' | 'neutral'; onClick: () => void }[];
}) {
  return (
    <div className="photo-card">
      <img src={`/media/photos/${photo.file}`} alt={photo.originalName} loading="lazy" />
      <div className="photo-meta">
        <span className="photo-name" title={photo.originalName}>
          {photo.originalName}
        </span>
        <span className="photo-source">{photo.source === 'drive' ? 'Drive' : photo.source === 'upload' ? 'Painel' : 'Pasta'}</span>
      </div>
      <div className="photo-actions">
        {actions.map((a) => (
          <button key={a.label} className={`btn btn-${a.kind}`} onClick={a.onClick}>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Moderation({
  photos,
  refresh,
  config,
  update
}: {
  photos: Photo[];
  refresh: () => void;
  config: WallConfig;
  update: (path: string, value: unknown) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const pending = photos.filter((p) => p.status === 'pending');
  const approved = photos.filter((p) => p.status === 'approved');
  const rejected = photos.filter((p) => p.status === 'rejected');

  const act = (fn: Promise<unknown>) => fn.then(refresh).catch(() => undefined);

  return (
    <div className="section">
      <div className="section-head">
        <h2>Moderação</h2>
        <div className="head-actions">
          <Toggle
            label="Aprovação automática"
            hint="novas fotos entram no telão sem revisão"
            checked={config.sources.autoApprove}
            onChange={(v) => update('sources.autoApprove', v)}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>
            Fila de aprovação <span className="badge">{pending.length}</span>
          </h3>
          {pending.length > 0 && (
            <button className="btn btn-ok" onClick={() => act(api.approveAll())}>
              ✓ Aprovar todas
            </button>
          )}
        </div>
        {pending.length === 0 ? (
          <p className="muted">Nenhuma foto aguardando aprovação.</p>
        ) : (
          <div className="photo-grid">
            {pending.map((p) => (
              <PhotoCard
                key={p.id}
                photo={p}
                actions={[
                  { label: '✓ Aprovar', kind: 'ok', onClick: () => act(api.setStatus(p.id, 'approved')) },
                  { label: '✕ Rejeitar', kind: 'danger', onClick: () => act(api.setStatus(p.id, 'rejected')) }
                ]}
              />
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h3>
            No telão <span className="badge badge-ok">{approved.length}</span>
          </h3>
          <button className="btn btn-neutral" onClick={() => fileInput.current?.click()}>
            + Enviar fotos
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) {
                act(api.uploadPhotos(e.target.files));
                e.target.value = '';
              }
            }}
          />
        </div>
        {approved.length === 0 ? (
          <p className="muted">Nenhuma foto aprovada ainda.</p>
        ) : (
          <div className="photo-grid">
            {approved.map((p) => (
              <PhotoCard
                key={p.id}
                photo={p}
                actions={[
                  { label: 'Tirar do telão', kind: 'danger', onClick: () => act(api.setStatus(p.id, 'rejected')) }
                ]}
              />
            ))}
          </div>
        )}
      </div>

      {rejected.length > 0 && (
        <div className="card">
          <div className="card-head">
            <h3>
              Rejeitadas <span className="badge badge-danger">{rejected.length}</span>
            </h3>
          </div>
          <div className="photo-grid">
            {rejected.map((p) => (
              <PhotoCard
                key={p.id}
                photo={p}
                actions={[
                  { label: 'Recuperar', kind: 'ok', onClick: () => act(api.setStatus(p.id, 'approved')) },
                  { label: 'Excluir', kind: 'danger', onClick: () => act(api.deletePhoto(p.id)) }
                ]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
