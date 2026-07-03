import type { WallConfig } from '@photowall/shared';
import { NumberField, RangeField, SelectField, Toggle } from '../controls';

const MODES = [
  {
    value: 'mosaic' as const,
    title: 'Mosaico vivo',
    desc: 'Cada foto troca de forma independente, em posições sorteadas — visual dinâmico e moderno.'
  },
  {
    value: 'paged' as const,
    title: 'Paginado',
    desc: 'Páginas completas de fotos com crossfade, como na versão 1.'
  },
  {
    value: 'scroll' as const,
    title: 'Scroll automático',
    desc: 'A parede rola continuamente, como um feed infinito de momentos.'
  }
];

export default function GridAnimation({
  config,
  update
}: {
  config: WallConfig;
  update: (path: string, value: unknown) => void;
}) {
  const { grid, animation } = config;

  return (
    <div className="section">
      <div className="section-head">
        <h2>Grid &amp; Animação</h2>
      </div>

      <div className="card">
        <h3>Grid</h3>
        <div className="row-4">
          <NumberField label="Linhas" value={grid.rows} min={1} max={20} onChange={(v) => update('grid.rows', v)} />
          <NumberField label="Colunas" value={grid.cols} min={1} max={20} onChange={(v) => update('grid.cols', v)} />
          <NumberField label="Espaçamento (px)" value={grid.gap} min={0} max={200} onChange={(v) => update('grid.gap', v)} />
          <NumberField label="Margem (px)" value={grid.padding} min={0} max={400} onChange={(v) => update('grid.padding', v)} />
        </div>
      </div>

      <div className="card">
        <h3>Modo de exibição</h3>
        <div className="mode-cards">
          {MODES.map((m) => (
            <button
              key={m.value}
              className={`mode-card ${animation.mode === m.value ? 'active' : ''}`}
              onClick={() => update('animation.mode', m.value)}
            >
              <strong>{m.title}</strong>
              <span>{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Animação de entrada</h3>
        <div className="row-2">
          <SelectField
            label="Efeito"
            value={animation.entry}
            options={[
              { value: 'random', label: 'Aleatório (mistura todos)' },
              { value: 'fade', label: 'Fade' },
              { value: 'zoom', label: 'Zoom' },
              { value: 'pop', label: 'Pop' },
              { value: 'flip', label: 'Flip 3D' },
              { value: 'slide', label: 'Deslizar de fora' }
            ]}
            onChange={(v) => update('animation.entry', v)}
          />
          <RangeField
            label="Duração da entrada"
            value={animation.entryDuration}
            min={100}
            max={3000}
            step={50}
            unit="ms"
            onChange={(v) => update('animation.entryDuration', v)}
          />
        </div>
        <Toggle
          label="Randomizar ordem/posição de entrada"
          hint="fotos entram em posições e tempos sorteados"
          checked={animation.randomizeOrder}
          onChange={(v) => update('animation.randomizeOrder', v)}
        />
      </div>

      {animation.mode === 'mosaic' && (
        <div className="card">
          <h3>Ritmo do mosaico</h3>
          <RangeField
            label="Intervalo entre trocas"
            value={animation.swapInterval}
            min={300}
            max={15000}
            step={100}
            unit="ms"
            onChange={(v) => update('animation.swapInterval', v)}
          />
        </div>
      )}

      {animation.mode === 'paged' && (
        <div className="card">
          <h3>Ritmo das páginas</h3>
          <div className="row-2">
            <RangeField
              label="Tempo por página"
              value={animation.pageDuration}
              min={2000}
              max={60000}
              step={500}
              unit="ms"
              onChange={(v) => update('animation.pageDuration', v)}
            />
            <RangeField
              label="Duração do crossfade"
              value={animation.fadeDuration}
              min={100}
              max={3000}
              step={50}
              unit="ms"
              onChange={(v) => update('animation.fadeDuration', v)}
            />
          </div>
        </div>
      )}

      {animation.mode === 'scroll' && (
        <div className="card">
          <h3>Velocidade do scroll</h3>
          <RangeField
            label="Velocidade"
            value={animation.scrollSpeed}
            min={5}
            max={200}
            unit=" px/s"
            onChange={(v) => update('animation.scrollSpeed', v)}
          />
        </div>
      )}

      <div className="card">
        <h3>Parallax</h3>
        <Toggle
          label="Deriva parallax"
          hint="as fotos flutuam sutilmente, dando vida à parede"
          checked={animation.parallax}
          onChange={(v) => update('animation.parallax', v)}
        />
        {animation.parallax && (
          <RangeField
            label="Intensidade"
            value={animation.parallaxIntensity}
            min={1}
            max={40}
            unit="px"
            onChange={(v) => update('animation.parallaxIntensity', v)}
          />
        )}
      </div>
    </div>
  );
}
