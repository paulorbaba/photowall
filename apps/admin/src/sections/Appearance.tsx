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
  const logoInput = useRef<HTMLInputElement>(null);
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
            <SelectField
              label="Enquadramento padrão das fotos"
              value={frame.photoAlign}
              options={[
                { value: 'top', label: 'Topo (bom para retratos/rostos)' },
                { value: 'center', label: 'Centralizado' },
                { value: 'bottom', label: 'Rodapé' }
              ]}
              onChange={(v) => update('frame.photoAlign', v)}
            />
            <p className="muted" style={{ fontSize: 12 }}>
              Dica: fotos de pessoas geralmente ficam melhores com enquadramento pelo topo. Você
              também pode ajustar foto a foto na aba Moderação.
            </p>
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

                <div className="row-inline" style={{ marginBottom: 12 }}>
                  <button className="btn btn-neutral" onClick={() => logoInput.current?.click()}>
                    {title.logoFile ? 'Trocar logo da marca' : 'Enviar logo da marca'}
                  </button>
                  {title.logoFile && (
                    <button className="btn btn-danger" onClick={() => update('title.logoFile', null)}>
                      Remover logo
                    </button>
                  )}
                </div>
                <input
                  ref={logoInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      api.uploadLogo(file).then(setConfig).catch(() => undefined);
                      e.target.value = '';
                    }
                  }}
                />
                {title.logoFile && (
                  <>
                    <div className="logo-preview">
                      <img src={title.logoFile} alt="logo" />
                    </div>
                    <RangeField
                      label="Tamanho do logo"
                      value={title.logoSize}
                      min={4}
                      max={20}
                      unit="vh"
                      onChange={(v) => update('title.logoSize', v)}
                    />
                  </>
                )}
              </>
            )}
          </div>

          {title.enabled && (
            <div className="card">
              <h3>Posição e escala do bloco</h3>
              {(() => {
                // Estimativa da altura do bloco (logo + título + subtítulo),
                // nos mesmos termos usados pelo CSS do telão, para alertar
                // quando "distância até o grid" for menor que o bloco real.
                const blockHeight =
                  title.offsetY +
                  (title.logoFile ? title.logoSize + 1.2 : 0) +
                  title.titleSize +
                  (title.subtitle ? title.subtitleSize + 0.6 : 0);
                const overlap = blockHeight > title.gridGap;
                if (!overlap) return null;
                return (
                  <div className="overlap-warning">
                    ⚠️ O bloco (~{blockHeight.toFixed(1)}vh) é mais alto que a distância até o
                    grid ({title.gridGap}vh) — o título pode sobrepor as fotos.
                    <button
                      className="btn btn-neutral"
                      style={{ marginTop: 8 }}
                      onClick={() => update('title.gridGap', Math.round(blockHeight + 2))}
                    >
                      Ajustar automaticamente
                    </button>
                  </div>
                );
              })()}
              <SelectField
                label="Alinhamento horizontal"
                value={title.alignH}
                options={[
                  { value: 'left', label: 'Esquerda' },
                  { value: 'center', label: 'Centro' },
                  { value: 'right', label: 'Direita' }
                ]}
                onChange={(v) => update('title.alignH', v)}
              />
              <RangeField
                label="Deslocamento horizontal"
                value={title.offsetX}
                min={-40}
                max={40}
                unit="vw"
                onChange={(v) => update('title.offsetX', v)}
              />
              <RangeField
                label="Distância do topo"
                value={title.offsetY}
                min={0}
                max={60}
                unit="vh"
                onChange={(v) => update('title.offsetY', v)}
              />
              <RangeField
                label="Tamanho do título"
                value={title.titleSize}
                min={2}
                max={14}
                step={0.2}
                unit="vh"
                onChange={(v) => update('title.titleSize', v)}
              />
              <RangeField
                label="Tamanho do subtítulo"
                value={title.subtitleSize}
                min={1}
                max={8}
                step={0.2}
                unit="vh"
                onChange={(v) => update('title.subtitleSize', v)}
              />
              <RangeField
                label="Distância até o grid de fotos"
                value={title.gridGap}
                min={0}
                max={40}
                unit="vh"
                onChange={(v) => update('title.gridGap', v)}
              />
              <p className="muted" style={{ fontSize: 12 }}>
                Dica: use esquerda/direita com o deslocamento horizontal para encostar o bloco
                numa borda; "distância até o grid" evita que o título encoste nas fotos.
              </p>
            </div>
          )}
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
