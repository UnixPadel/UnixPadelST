const { contextBridge, ipcRenderer } = require('electron');

// Masaüstü köprüsü — yalnız arayüz ölçeği (zoom) ayarı. contextIsolation açık;
// renderer'a Node/ipcRenderer verilmez, sadece bu üç fonksiyon.
contextBridge.exposeInMainWorld('desktop', {
  getZoom: () => ipcRenderer.invoke('desktop:get-zoom'),
  setZoom: (setting) => ipcRenderer.invoke('desktop:set-zoom', setting),
  onZoomChange: (cb) => {
    const listener = (_e, info) => cb(info);
    ipcRenderer.on('desktop:zoom-changed', listener);
    return () => ipcRenderer.removeListener('desktop:zoom-changed', listener);
  },
});
