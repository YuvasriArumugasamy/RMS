const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Sync Chef image.png to public favicon.png as app icon
try {
  const chefImage = path.join(__dirname, 'src', 'assets', 'image.png');
  const targetFavicon = path.join(__dirname, 'public', 'favicon.png');
  if (fs.existsSync(chefImage)) {
    fs.copyFileSync(chefImage, targetFavicon);
  }
} catch (e) {}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'RMS Restaurant ERP',
    icon: path.join(__dirname, 'public', 'favicon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  if (isDev) {
    // In dev mode, load Vite dev server
    win.loadURL(process.env.ELECTRON_START_URL || 'http://localhost:5173');
  } else {
    // In production build, load index.html from dist
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
