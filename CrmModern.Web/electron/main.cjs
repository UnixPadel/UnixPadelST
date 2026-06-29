const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// UnixPadelST masaüstü istemcisi.
// API merkezi olarak Render.com'da host edilir (.env.production'daki VITE_API_URL).
// Bu wrapper sadece derlenmiş React build'ini gösterir; yerel API başlatmaz.

let mainWindow;

// ── Auto-update (TAM OTOMATİK — §15) ──────────────────────────────────────
// Akış:
//   1. App açılır → 5 sn sonra GitHub Releases kontrol edilir; ayrıca açık kalan
//      uygulama için PERİYODİK olarak (30 dk) tekrar kontrol edilir — böylece
//      çalışan istemci yeni sürümü elle yeniden başlatmaya gerek kalmadan görür.
//   2. Yeni sürüm varsa arka planda otomatik indirilir (autoDownload).
//   3. İndirme bittiğinde kullanıcıya zorlamayan bir "şimdi yeniden başlat?"
//      seçeneği sunulur. Hayır derse iş akışı bozulmaz: autoInstallOnAppQuit ile
//      güncelleme bir sonraki kapanışta zaten kurulur.
//   4. Bir sonraki açılışta yeni sürüm zaten yüklüdür.
// ERP kullanıcıları güncellemeyi asla elle indirmez; süreç GitHub Release
// dağıtım sistemiyle (latest.yml + NSIS installer) tam uyumludur.
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 dk
let updatePromptShown = false; // aynı indirme için tekrar tekrar sormayalım

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;          // yeni sürümü arka planda sessizce indir
  autoUpdater.autoInstallOnAppQuit = true;  // kullanıcı "daha sonra" derse kapanışta kur

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
    console.log('[auto-update] indirildi:', info?.version);
    if (updatePromptShown) return;
    updatePromptShown = true;
    // Zorlamayan teklif: "Şimdi yeniden başlat" → hemen kur; "Daha sonra" →
    // autoInstallOnAppQuit kapanışta halleder. Pencere yoksa sessizce beklet.
    const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
    dialog.showMessageBox(win, {
      type: 'info',
      buttons: ['Şimdi yeniden başlat', 'Daha sonra'],
      defaultId: 0,
      cancelId: 1,
      title: 'Güncelleme hazır',
      message: `Yeni sürüm (${info?.version ?? ''}) indirildi.`,
      detail: 'Şimdi yeniden başlatarak güncellemeyi tamamlayabilir veya daha sonra (uygulamayı kapattığınızda otomatik kurulur) devam edebilirsiniz.',
    }).then(({ response }) => {
      if (response === 0) {
        // isSilent=true (sessiz kur), isForceRunAfter=true (kurunca yeniden aç)
        autoUpdater.quitAndInstall(true, true);
      }
    }).catch((err) => console.error('[auto-update] prompt hatası:', err?.message || err));
  });

  // İlk kontrol: pencere yüklendikten 5 sn sonra (yavaş ağda bloke etmesin).
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[auto-update] checkForUpdates başarısız:', err?.message || err);
    });
  }, 5000);

  // Periyodik kontrol: uzun süre açık kalan istemci de güncellemeyi yakalasın.
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[auto-update] periyodik kontrol başarısız:', err?.message || err);
    });
  }, UPDATE_CHECK_INTERVAL_MS);
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
