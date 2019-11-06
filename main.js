const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 1000,
    x: 100,
    y: 100,
    icon: path.join(__dirname, '/images/sspu_icon.png'),
    webPreferences: { nodeIntegration: true },
    show: true
  });

  mainWindow.webContents.openDevTools();
  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // mainWindow.webContents.on('did-finish-load', () => {
  //   mainWindow.show();
  // });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// ipcMain.on('loginForm:submit', (e, data) => {
//  fetch3parData();
// });
