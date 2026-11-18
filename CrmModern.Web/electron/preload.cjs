const { contextBridge, ipcRenderer } = require('electron');

// Masaüstü köprüsü — arayüz ölçeği (zoom) ve arayüz dili bildirimi. contextIsolation açık;
// renderer'a Node/ipcRenderer verilmez, sadece bu fonksiyonlar.
contextBridge.exposeInMainWorld('desktop', {
  setLanguage: (language) => ipcRenderer.send('desktop:set-language', language),
  getZoom: () => ipcRenderer.invoke('desktop:get-zoom'),
  setZoom: (setting) => ipcRenderer.invoke('desktop:set-zoom', setting),
  onZoomChange: (cb) => {
    const listener = (_e, info) => cb(info);
    ipcRenderer.on('desktop:zoom-changed', listener);
    return () => ipcRenderer.removeListener('desktop:zoom-changed', listener);
  },
});
