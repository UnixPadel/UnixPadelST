const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// UnixPadelST masaüstü istemcisi.
// API merkezi olarak Render.com'da host edilir (.env.production'daki VITE_API_URL).
// Bu wrapper sadece derlenmiş React build'ini gösterir; yerel API başlatmaz.

let mainWindow;

// ── Auto-update ──────────────────────────────────────────────────────────
// Akış (sessiz indir, restart'ta uygula):
//   1. App açılır → 5 sn sonra GitHub Releases kontrol edilir
//   2. Yeni sürüm varsa arka planda indirilir (kullanıcı çalışmaya devam eder)
//   3. İndirme bitince küçük bir dialog: "Şimdi yeniden başlat / Sonra"
//   4. "Sonra" derse → uygulama bir sonraki kapanışta otomatik yükler
function setupAutoUpdater() {
  autoUpdater.autoDownload = true;          // sessiz indir
  autoUpdater.autoInstallOnAppQuit = true;  // kapanışta otomatik kur

  autoUpdater.on('error', (err) => {
    console.error('[auto-update] error:', err?.message || err);
    // Hata kullanıcıyı rahatsız etmesin — sessizce loglanır.
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[auto-update] yeni sürüm bulundu:', info?.version);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[auto-update] güncel sürüm kullanılıyor');
  });

  autoUpdater.on('update-downloaded', async (info) => {
    console.log('[auto-update] indirildi:', info?.version);
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['Şimdi Yeniden Başlat', 'Sonra'],
      defaultId: 0,
      cancelId: 1,
      title: 'UnixPadelST güncellendi',
      message: `Yeni sürüm hazır: ${info?.version || ''}`,
      detail: 'Şimdi yeniden başlatırsan güncelleme uygulanır. "Sonra" dersen bir sonraki açılışta otomatik yüklenir.',
    });
    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  // İlk kontrol: pencere yüklendikten 5 sn sonra (yavaş ağda bloke etmesin).
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[auto-update] checkForUpdates başarısız:', err?.message || err);
    });
  }, 5000);
}

async function createWindow() {
  // Kurumsal kullanım için menü barını tamamen gizle.
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'UnixPadelST',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // F12 ile DevTools toggle — menü kaldırıldığı için (Menu.setApplicationMenu(null))
  // default accelerator çalışmıyor; manuel olarak before-input-event ile bind ediyoruz.
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  if (app.isPackaged) {
    await mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    setupAutoUpdater();  // sadece paketlenmiş build'de aktif
  } else {
    const waitOn = require('wait-on');
    await waitOn({ resources: ['http://localhost:5173'], timeout: 30000 });
    await mainWindow.loadURL('http://localhost:5173');
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
