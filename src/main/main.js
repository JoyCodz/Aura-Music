const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { startStreamServer } = require('./stream-server');
const { registerIpcHandlers } = require('./ipc-handlers');
const { ensureYtdlp } = require('./ytdlp-manager');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;
let streamPort;

app.setName('Aura Music');

async function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'Aura Music',
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f0f0f',
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Needed for local stream URLs
    },
    icon: path.join(__dirname, '../../resources/icon.png'),
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  // Ensure yt-dlp binary is available
  try {
    await ensureYtdlp();
  } catch (err) {
    console.warn('[main] yt-dlp check failed:', err.message);
  }

  // Start the local audio stream server
  streamPort = await startStreamServer();
  console.log(`[main] Stream server running on port ${streamPort}`);

  // Register IPC handlers (pass streamPort so renderer can build URLs)
  registerIpcHandlers(streamPort);

  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
