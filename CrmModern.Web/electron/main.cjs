const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// UnixPadelST masaüstü istemcisi.
// API merkezi olarak Render.com'da host edilir (.env.production'daki VITE_API_URL).
// Bu wrapper sadece derlenmiş React build'ini gösterir; yerel API başlatmaz.

let mainWindow;

// ── Auto-update (TAM OTOMATİK — §15) ──────────────────────────────────────
// Akış (tamamen sessiz, kullanıcı hiç onay vermez, hiç popup görmez):
//   1. App açılır → 5 sn sonra GitHub Releases kontrol edilir
//   2. Yeni sürüm varsa arka planda otomatik indirilir (autoDownload)
//   3. İndirme bittiğinde HİÇBİR dialog gösterilmez — kullanıcı çalışmaya devam eder
//   4. Uygulama kapanırken güncelleme otomatik kurulur (autoInstallOnAppQuit)
//   5. Bir sonraki açılışta yeni sürüm zaten yüklüdür
// ERP kullanıcıları güncellemeyi asla elle kurmaz; süreç GitHub Release
// dağıtım sistemiyle (latest.yml + NSIS installer) tam uyumludur.
function setupAutoUpdater() {
  autoUpdater.autoDownload = true;          // yeni sürümü arka planda sessizce indir
  autoUpdater.autoInstallOnAppQuit = true;  // kapanışta sessizce kur (restart prompt yok)

  autoUpdater.on('error', (err) => {
    console.error('[auto-update] error:', err?.message || err);
    // Hata kullanıcıyı rahatsız etmesin — sessizce loglanır.
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[auto-update] yeni sürüm bulundu, arka planda indiriliyor:', info?.version);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[auto-update] güncel sürüm kullanılıyor');
  });

  autoUpdater.on('update-downloaded', (info) => {
    // Sessiz akış: dialog YOK, quitAndInstall YOK. autoInstallOnAppQuit=true
    // olduğu için güncelleme uygulama kapanışında otomatik uygulanır.
    console.log('[auto-update] indirildi, sonraki kapanışta otomatik kurulacak:', info?.version);
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
    // §32 — minWidth 1280/minHeight 720 idi; DPI ölçeklemeli (125%/150%) veya küçük
    // dizüstü/harici monitörlerde MANTIKSAL çözünürlük bunun altına düşünce pencere
    // ekrana SIĞMIYOR → içerik taşıyor/kesiliyor. Layout zaten responsive (içerik
    // <lg'de dikey yığılır, tablolar kendi sarmalayıcılarında kayar), bu yüzden min'i
    // düşürdük: pencere küçük ekrana sığsın, layout uyum sağlasın.
    minWidth: 1024,
    minHeight: 640,
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
