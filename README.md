# Photo Wall v2

Parede de fotos em tempo real para eventos: fotos enviadas pelos convidados (pasta local ou
Google Drive) aparecem num telão animado, com fila de moderação e painel de configuração visual.

Sucessora da v1 em Python/Tkinter — reescrita em TypeScript com renderização web (animações
aceleradas por GPU, vídeo de fundo, parallax) mantendo a filosofia *local-first*: o telão nunca
depende da internet para continuar funcionando.

## Arquitetura

```
apps/server   Backend Node/Fastify: API REST + WebSocket, watcher de pasta local,
              conector Google Drive, fila de moderação, cache local de fotos
apps/wall     Telão (React): grid animado em 3 modos, fundo cor/imagem/vídeo, molduras
apps/admin    Painel (React): moderação, aparência, grid/animação, fontes de fotos
apps/desktop  Wrapper Electron opcional (kiosk offline)
packages/shared  Tipos e configuração padrão compartilhados
```

Tudo roda num único processo Node na máquina do evento. O painel pode ser aberto de outro
dispositivo na mesma rede (celular/tablet do operador).

## Como rodar

```bash
npm install
npm run build
npm start
```

- **Telão:** http://localhost:4700/ (F11 para tela cheia, ou use os scripts de kiosk)
- **Painel:** http://localhost:4700/admin/

Para desenvolvimento com hot-reload (`server :4700`, `wall :5173`, `admin :5174`):

```bash
npm run dev
```

### Testar com fotos de exemplo

```bash
npm run samples   # gera PNGs coloridos em data/incoming
```

As fotos entram na fila de moderação (aba **Moderação** do painel). Ative "Aprovação
automática" para que entrem direto no telão.

## Fluxo das fotos

1. Uma foto chega por uma das fontes: **pasta local** observada, **Google Drive** ou
   **upload no painel**.
2. O servidor copia a foto para o cache local (`data/photos/`) — a partir daí o telão não
   depende de rede nenhuma.
3. Com a moderação ativa, a foto fica **pendente** até o operador aprovar no painel.
4. Ao aprovar, a foto estreia no telão em tempo real (WebSocket), com a animação configurada.

## Google Drive (upload pelos convidados)

Compartilhe uma pasta do Drive com os convidados (eles enviam fotos pelo app do Drive no
celular) e configure na aba **Fontes de fotos**:

- **Pasta pública** ("qualquer pessoa com o link pode ver"): basta o **ID da pasta** + uma
  **chave de API** (Google Cloud Console → APIs e serviços → Credenciais → Chave de API,
  com a Drive API ativada).
- **Pasta privada**: crie uma **service account**, baixe o JSON de credenciais, compartilhe a
  pasta do Drive com o e-mail da service account e informe o caminho do JSON no painel.

O servidor sincroniza no intervalo configurado; se a internet cair, o telão continua exibindo
o cache local e a sincronização retoma sozinha.

## Modos de exibição

| Modo | Comportamento |
|---|---|
| **Mosaico vivo** (padrão) | Cada célula troca de foto de forma independente e aleatória; fotos recém-aprovadas estreiam na hora em posições sorteadas. |
| **Paginado** | Páginas completas com crossfade (comportamento da v1), com entrada animada por foto. |
| **Scroll automático** | A parede rola verticalmente sem parar, como um feed infinito. |

Animações de entrada: fade, zoom, pop, flip 3D, deslizar de fora, ou aleatório. O efeito
**parallax** faz cada foto flutuar sutilmente num vetor próprio.

## Instalação na máquina do evento

**Opção simples (recomendada):** Node.js + navegador.

```bash
npm run build && npm start
./scripts/kiosk-linux.sh http://localhost:4700 1920 0   # Linux (X,Y = posição do monitor)
scripts\kiosk-windows.bat http://localhost:4700 1920 0  # Windows
```

**Opção instalável:** wrapper Electron em `apps/desktop` (sobe o backend embutido e abre o
telão em kiosk; `Esc` fecha). Gere o instalável com:

```bash
npm run build                       # na raiz
cd apps/desktop && npm install && npm run dist
```

## Deploy online (para testar com outras pessoas pelo link)

Além de rodar localmente numa máquina de evento, dá para colocar o Photo Wall no ar num link
público para outras pessoas testarem no navegador. A app já é *cloud-ready* (porta via
`process.env.PORT`, bind em `0.0.0.0`, URLs de frontend relativas) — só falta um host que rode
um **processo Node persistente** (não serverless), porque o backend mantém um WebSocket server e
um watcher de pasta abertos o tempo todo.

**Por que não Vercel:** o modelo serverless da Vercel não sustenta WebSocket de longa duração nem
um watcher de arquivos contínuo, e as funções não compartilham disco entre invocações. Funcionaria
só com uma reengenharia grande (storage externo, pub/sub externo). Para "testar rápido", plataformas
com container persistente (Railway, Render, Fly.io) são o encaixe certo — usamos Railway aqui.

### Deploy no Railway

O repositório já tem um `Dockerfile` multi-stage pronto (builda `packages/shared` → `apps/server`
→ `apps/wall` → `apps/admin` e roda só os artefatos finais) e um `railway.json` que força o
Railway a usar esse Dockerfile. Para publicar:

1. Crie um projeto no [railway.app](https://railway.app) e conecte este repositório GitHub
   (branch atual: `claude/photo-wall-redesign-planning-k2r6wj`).
2. **Importante: este projeto é UM serviço só.** Se o Railway oferecer dividir o monorepo em
   vários serviços (um por workspace, ex.: `@photowall/wall`, `@photowall/admin`), recuse/apague
   esses serviços — `wall` e `admin` são builds estáticos servidos pelo próprio backend e crasham
   se implantados sozinhos. Mantenha apenas um serviço com **Root Directory na raiz do repo**;
   o `railway.json` garante o build via Dockerfile. A porta é injetada via `process.env.PORT`
   (já suportado).
3. Após o deploy, gere um domínio público em **Settings → Networking → Generate Domain**. Você
   terá algo como `https://seu-projeto.up.railway.app` — telão em `/`, painel em `/admin/`.
4. Compartilhe o link do telão e do painel com quem for testar.

**Importante — este deploy padrão não tem autenticação nem disco persistente:**
- **Sem senha no `/admin`**: qualquer pessoa com o link pode mudar a configuração, aprovar/rejeitar
  ou apagar fotos. Adequado só para teste rápido entre pessoas de confiança — não exponha o link
  publicamente sem adicionar proteção antes.
- **Sem persistência**: o sistema de arquivos do container é efêmero; fotos e configurações somem
  a cada reinício/redeploy. Para manter dados entre deploys, anexe um
  [Railway Volume](https://docs.railway.app/reference/volumes) e aponte a variável de ambiente
  `PHOTOWALL_DATA` para o caminho do volume — o código já lê essa variável
  (`apps/server/src/paths.ts`), não precisa mudar nada.

### Testar a imagem Docker localmente (opcional)

```bash
docker build -t photowall .
docker run -p 4700:4700 photowall
```

## Configuração

Toda a configuração é feita pelo painel (nada de editar JSON na mão). O estado fica em
`data/config.json` e `data/photos.json`; para "resetar" um evento, apague a pasta `data/`.

Variáveis de ambiente úteis:

- `PORT` — porta do servidor (padrão 4700)
- `PHOTOWALL_DATA` — pasta de dados (padrão `./data`)

## Screenshots de verificação

Com o servidor no ar:

```bash
npm run screenshot   # gera screenshots/wall.png e screenshots/admin.png
```
