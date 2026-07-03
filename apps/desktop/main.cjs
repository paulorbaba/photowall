// Photo Wall v2 — wrapper Electron para instalação offline na máquina do evento.
// Sobe o backend embutido e abre o telão em kiosk; o painel fica acessível
// pela rede local em http://<ip-da-maquina>:4700/admin/
//
// Este pacote é opcional: o mesmo resultado se obtém com `npm start` +
// scripts/kiosk-*.sh. Instale as dependências aqui apenas quando for gerar
// o instalável (npm install && npm run dist dentro de apps/desktop).

const { app, BrowserWindow, globalShortcut } = require('electron');
const { fork } = require('node:child_process');
const path = require('node:path');

const PORT = process.env.PORT || 4700;
let serverProcess = null;

function startServer() {
  const serverEntry = app.isPackaged
    ? path.join(process.resourcesPath, 'server', 'index.js')
    : path.join(__dirname, '..', 'server', 'dist', 'index.js');

  serverProcess = fork(serverEntry, [], {
    env: {
      ...process.env,
      PORT: String(PORT),
      PHOTOWALL_DATA: path.join(app.getPath('userData'), 'data')
    }
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    kiosk: true,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: { contextIsolation: true }
  });

  // Espera o backend responder antes de carregar o telão.
  const url = `http://localhost:${PORT}/`;
  for (let i = 0; i < 40; i++) {
    try {
      await fetch(`${url}api/config`);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  await win.loadURL(url);

  globalShortcut.register('Escape', () => app.quit());
}

app.whenReady().then(() => {
  startServer();
  createWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  serverProcess?.kill();
});

app.on('window-all-closed', () => app.quit());
