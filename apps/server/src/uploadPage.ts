import type { WallConfig } from '@photowall/shared';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Página pública de upload para convidados (mobile-first, self-contained).
 * Servida em GET /upload; envia para POST /api/guest-upload e as fotos caem
 * na fila de moderação. Sem dependências, sem build: HTML gerado no servidor
 * com o branding (logo/título) do evento vindo da config.
 */
export function renderUploadPage(config: WallConfig): string {
  const title = config.title.text || 'Photo Wall';
  const subtitle = config.title.subtitle || '';
  const logo = config.title.logoFile
    ? `<img class="logo" src="${esc(config.title.logoFile)}" alt="">`
    : '';
  const accent = config.frame.borderColor || '#7c5cff';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Envie sua foto — ${esc(title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    min-height: 100dvh;
    background: radial-gradient(120% 90% at 50% 0%, #1c1440 0%, #0b0820 60%, #060412 100%);
    color: #f0edff;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    display: flex; flex-direction: column; align-items: center;
    padding: 32px 20px calc(20px + env(safe-area-inset-bottom));
    text-align: center;
  }
  .logo { max-height: 64px; max-width: 70vw; object-fit: contain; margin-bottom: 18px; }
  h1 { font-size: 26px; font-weight: 800; letter-spacing: .08em; }
  .sub { color: #b9b3d9; font-size: 14px; margin-top: 6px; max-width: 340px; }
  .drop {
    margin: 34px 0 10px; width: 100%; max-width: 380px;
    border: 2px dashed ${esc(accent)}66; border-radius: 20px;
    padding: 38px 20px; cursor: pointer;
    background: rgba(255,255,255,.03);
    transition: background .2s, border-color .2s;
  }
  .drop:active { background: rgba(255,255,255,.08); }
  .drop .icon { font-size: 44px; display: block; margin-bottom: 12px; }
  .drop strong { font-size: 17px; display: block; }
  .drop span { color: #b9b3d9; font-size: 13px; display: block; margin-top: 6px; }
  .list { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
  .item {
    display: flex; align-items: center; gap: 10px;
    background: rgba(255,255,255,.05); border-radius: 12px; padding: 10px 14px;
    font-size: 13px; text-align: left;
  }
  .item img { width: 40px; height: 40px; object-fit: cover; border-radius: 8px; }
  .item .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #d9d4f2; }
  .item .st { font-size: 15px; }
  .ok { color: #4ade9c; } .err { color: #ff7c90; }
  .note { color: #8f88b5; font-size: 12px; margin-top: 22px; max-width: 320px; line-height: 1.5; }
  .credit { margin-top: auto; padding-top: 34px; color: #6c6494; font-size: 11px; letter-spacing: .06em; }
  input[type=file] { display: none; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { display: inline-block; width: 14px; height: 14px; border: 2px solid #b9b3d9; border-top-color: transparent; border-radius: 50%; animation: spin .7s linear infinite; }
</style>
</head>
<body>
  ${logo}
  <h1>${esc(title)}</h1>
  ${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ''}

  <label class="drop" for="file">
    <span class="icon">📸</span>
    <strong>Toque para enviar suas fotos</strong>
    <span>Tire uma foto agora ou escolha da galeria</span>
  </label>
  <input id="file" type="file" accept="image/*" multiple>
  <div class="list" id="list"></div>
  <p class="note">Suas fotos passam por uma rápida aprovação antes de aparecer no telão. Sorria! 🎉</p>
  <p class="credit">PHOTO WALL · BY SHERPA42</p>

<script>
  const input = document.getElementById('file');
  const list = document.getElementById('list');

  input.addEventListener('change', async () => {
    const files = Array.from(input.files || []);
    input.value = '';
    for (const file of files) {
      const item = document.createElement('div');
      item.className = 'item';
      const thumb = document.createElement('img');
      thumb.src = URL.createObjectURL(file);
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = file.name;
      const st = document.createElement('span');
      st.className = 'st';
      st.innerHTML = '<span class="spin"></span>';
      item.append(thumb, name, st);
      list.prepend(item);

      try {
        const fd = new FormData();
        fd.append('photo', file);
        const res = await fetch('/api/guest-upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok && data.ingested > 0) {
          st.innerHTML = '<span class="ok">✓ enviada</span>';
        } else {
          st.innerHTML = '<span class="err">✕ falhou</span>';
        }
      } catch {
        st.innerHTML = '<span class="err">✕ sem conexão</span>';
      }
    }
  });
</script>
</body>
</html>`;
}
