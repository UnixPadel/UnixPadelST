const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// UnixPadelST masaüstü istemcisi.
// API merkezi olarak Render.com'da host edilir (.env.production'daki VITE_API_URL).
// Bu wrapper sadece derlenmiş React build'ini gösterir; yerel API başlatmaz.

async function createWindow() {
  // Kurumsal kullanım için menü barını tamamen gizle.
  Menu.setApplicationMenu(null);

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'UnixPadelST',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // F12 / Ctrl+Shift+I ile DevTools açılabilsin (kurumsal kullanım için
  // engelli değil; ileride istersen Menu/accelerator ile kapatabilirsin).
  // GEÇİCİ DEBUG: paketlenmiş .exe'de de DevTools'u otomatik aç.
  // Sorun çözüldükten sonra bu satırı sileceğiz.
  win.webContents.openDevTools({ mode: 'detach' });

  if (app.isPackaged) {
    await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    const waitOn = require('wait-on');
    await waitOn({ resources: ['http://localhost:5173'], timeout: 30000 });
    await win.loadURL('http://localhost:5173');
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
