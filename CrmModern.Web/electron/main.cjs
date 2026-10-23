const { app, BrowserWindow, Menu, dialog, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
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

// ── Pencere durumu + arayüz ölçeği (scaling Faz 1) ─────────────────────────
// Windows %125/%150 ölçekte CSS viewport küçülür (1920×1080@125% ≈ 1536×790);
// web ölçeğindeki arayüz tabloya yer bırakmaz. Ölçek 'auto' iken çalışma alanı
// yüksekliğine göre küçültülür; kullanıcı Ctrl+= / Ctrl+- / Ctrl+0, Ctrl+tekerlek
// veya Tercihlerim → Arayüz ölçeği ile seçerse o değer kalıcı olur.
// Boyut/konum/maximize da hatırlanır; ilk açılış maximize.
const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');
const ZOOM_STEPS = [0.8, 0.85, 0.9, 1, 1.1, 1.25];

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}

function writeState(patch) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify({ ...readState(), ...patch })); } catch { /* yoksay */ }
}

function autoZoomFor(win) {
  const h = screen.getDisplayMatching(win.getBounds()).workAreaSize.height;
  if (h < 720) return 0.85;
  if (h < 860) return 0.9;
  return 1;
}

/** Kayıtlı ayar ('auto' | sayı) → uygulanacak zoomFactor. */
function effectiveZoom(win) {
  const z = readState().zoom;
  return typeof z === 'number' ? z : autoZoomFor(win);
}

function applyZoom(win) {
  if (!win || win.isDestroyed()) return;
  const factor = effectiveZoom(win);
  win.webContents.setZoomFactor(factor);
  win.webContents.send('desktop:zoom-changed', { setting: readState().zoom ?? 'auto', factor });
}

function setZoomSetting(win, setting) {
  writeState({ zoom: setting === 'auto' ? 'auto' : Math.min(Math.max(Number(setting) || 1, 0.5), 2) });
  applyZoom(win);
}

function stepZoom(win, dir) {
  const cur = win.webContents.getZoomFactor();
  const next = dir > 0
    ? ZOOM_STEPS.find((s) => s > cur + 0.001) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]
    : [...ZOOM_STEPS].reverse().find((s) => s < cur - 0.001) ?? ZOOM_STEPS[0];
  setZoomSetting(win, next);
}

/** Kayıtlı sınırlar hâlâ bağlı bir ekranın içindeyse kullan (çıkarılmış monitör). */
function restoredBounds() {
  const b = readState().bounds;
  if (!b) return null;
  const visible = screen.getAllDisplays().some(({ workArea: a }) =>
    b.x < a.x + a.width - 100 && b.x + b.width > a.x + 100 && b.y >= a.y - 20 && b.y < a.y + a.height - 100);
  return visible ? b : null;
}

ipcMain.handle('desktop:get-zoom', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  return { setting: readState().zoom ?? 'auto', factor: win ? win.webContents.getZoomFactor() : 1 };
});
ipcMain.handle('desktop:set-zoom', (e, setting) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) setZoomSetting(win, setting);
});

async function createWindow() {
  // Kurumsal kullanım için menü barını tamamen gizle.
  Menu.setApplicationMenu(null);

  const saved = readState();
  const bounds = restoredBounds();

  mainWindow = new BrowserWindow({
    width: bounds?.width ?? 1280,
    height: bounds?.height ?? 800,
    ...(bounds ? { x: bounds.x, y: bounds.y } : {}),
    show: false,
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
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // İlk açılış (kayıt yok) veya son kapanışta maximize ise maximize aç.
  if (!bounds || saved.maximized !== false) mainWindow.maximize();
  mainWindow.show();

  const saveBounds = () => {
    if (mainWindow.isDestroyed() || mainWindow.isMinimized()) return;
    writeState({ maximized: mainWindow.isMaximized(), ...(mainWindow.isMaximized() ? {} : { bounds: mainWindow.getBounds() }) });
  };
  mainWindow.on('close', saveBounds);
  mainWindow.on('resized', saveBounds);
  mainWindow.on('moved', () => { saveBounds(); applyZoom(mainWindow); });
  mainWindow.webContents.on('did-finish-load', () => applyZoom(mainWindow));
  screen.on('display-metrics-changed', () => applyZoom(mainWindow));

  // Ctrl+tekerlek → bir adım büyüt/küçült (kalıcı).
  mainWindow.webContents.on('zoom-changed', (_e, dir) => stepZoom(mainWindow, dir === 'in' ? 1 : -1));

  // F12 ile DevTools toggle — menü kaldırıldığı için (Menu.setApplicationMenu(null))
  // default accelerator çalışmıyor; manuel olarak before-input-event ile bind ediyoruz.
  // Aynı sebeple zoom kısayolları da (Ctrl+= / Ctrl+- / Ctrl+0) burada bağlanır.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
      return;
    }
    if (!(input.control || input.meta) || input.alt) return;
    if (input.key === '=' || input.key === '+' || input.code === 'NumpadAdd') { event.preventDefault(); stepZoom(mainWindow, 1); }
    else if (input.key === '-' || input.code === 'NumpadSubtract') { event.preventDefault(); stepZoom(mainWindow, -1); }
    else if (input.key === '0' || input.code === 'Numpad0') { event.preventDefault(); setZoomSetting(mainWindow, 'auto'); }
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
