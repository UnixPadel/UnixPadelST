const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let apiProcess;

function startApi() {
  if (!app.isPackaged) return;
  const apiPath = path.join(process.resourcesPath, 'api', 'CrmModern.API.exe');
  apiProcess = spawn(apiPath, [], { detached: false });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  if (app.isPackaged) {
    await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    const waitOn = require('wait-on');
    await waitOn({ resources: ['http://localhost:5173'], timeout: 30000 });
    await win.loadURL('http://localhost:5173');
  }
}

app.whenReady().then(() => {
  startApi();
  createWindow();
});

app.on('window-all-closed', () => {
  if (apiProcess) {
    try { apiProcess.kill(); } catch (_) {}
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});