import { useRef } from 'react';
import type { WallConfig } from '@photowall/shared';
import { api, WALL_URL } from '../api';
import { ColorField, RangeField, SelectField, TextField, Toggle } from '../controls';

export default function Appearance({
  config,
  update,
  setConfig
}: {
  config: WallConfig;
  update: (path: string, value: unknown) => void;
  setConfig: (cfg: WallConfig) => void;
}) {
  const bgInput = useRef<HTMLInputElement>(null);
  const { background, frame, title } = config;

  return (
    <div className="section">
      <div className="section-head">
        <h2>Aparência</h2>
      </div>

      <div className="two-col">
        <div className="col">
          <div className="card">
            <h3>Fundo do telão</h3>
            <SelectField
              label="Tipo de fundo"
              value={background.type}
              options={[
                { value: 'color', label: 'Cor sólida' },
                { value: 'image', label: 'Imagem' },
                { value: 'video', label: 'Vídeo' }
              ]}
              onChange={(v) => update('background.type', v)}
            />
            <ColorField
              label="Cor de fundo"
              value={background.color}
              onChange={(v) => update('background.color', v)}
            />
            {background.type !== 'color' && (
              <>
                <button className="btn btn-neutral" onClick={() => bgInput.current?.click()}>
                  {background.file ? 'Trocar arquivo de fundo' : 'Enviar imagem ou vídeo de fundo'}
                </button>
                <input
                  ref={bgInput}
                  type="file"
                  accept="image/*,video/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      api.uploadBackground(file).then(setConfig).catch(() => undefined);
                      e.target.value = '';
                    }
                  }}
                />
                {background.file && <p className="muted">Arquivo atual: {background.file}</p>}
              </>
            )}
            <RangeField
              label="Escurecimento do fundo"
              value={Math.round(background.overlayOpacity * 100)}
              min={0}
              max={90}
              unit="%"
              onChange={(v) => update('background.overlayOpacity', v / 100)}
            />
          </div>

          <div className="card">
            <h3>Moldura das fotos</h3>
            <RangeField
              label="Espessura da borda"
              value={frame.borderWidth}
              min={0}
              max={30}
              unit="px"
              onChange={(v) => update('frame.borderWidth', v)}
            />
            <ColorField
              label="Cor da borda"
              value={frame.borderColor}
              onChange={(v) => update('frame.borderColor', v)}
            />
            <RangeField
              label="Cantos arredondados"
              value={frame.borderRadius}
              min={0}
              max={60}
              unit="px"
              onChange={(v) => update('frame.borderRadius', v)}
            />
            <RangeField
              label="Passe-partout (respiro interno)"
              value={frame.matte}
              min={0}
              max={40}
              unit="px"
              onChange={(v) => update('frame.matte', v)}
            />
            {frame.matte > 0 && (
              <ColorField
                label="Cor do passe-partout"
                value={frame.matteColor}
                onChange={(v) => update('frame.matteColor', v)}
              />
            )}
            <Toggle
              label="Sombra nas fotos"
              checked={frame.shadow}
              onChange={(v) => update('frame.shadow', v)}
            />
          </div>

          <div className="card">
            <h3>Título do evento</h3>
            <Toggle
              label="Exibir título sobre o telão"
              checked={title.enabled}
              onChange={(v) => update('title.enabled', v)}
            />
            {title.enabled && (
              <>
                <TextField label="Título" value={title.text} onChange={(v) => update('title.text', v)} />
                <TextField
                  label="Subtítulo"
                  value={title.subtitle}
                  onChange={(v) => update('title.subtitle', v)}
                />
                <ColorField label="Cor do texto" value={title.color} onChange={(v) => update('title.color', v)} />
              </>
            )}
          </div>
        </div>

        <div className="col">
          <div className="card preview-card">
            <h3>Prévia ao vivo</h3>
            <div className="preview-frame">
              <iframe src={WALL_URL} title="Prévia do telão" />
            </div>
            <a className="btn btn-neutral" href={WALL_URL} target="_blank" rel="noreferrer">
              ↗ Abrir telão em tela cheia
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
