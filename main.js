/* eslint-disable import/no-extraneous-dependencies */
const { app, BrowserWindow, ipcMain } = require('electron');
const windowStateKeeper = require('electron-window-state');
const path = require('path');
const updater = require('./updater');

// SET ENV
// process.env.NODE_ENV = 'production';
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let mainWindow;
let workerWindow;
let progressWindow;

function createWindow() {
  // Check for update after 2 seconds
  if (process.env.NODE_ENV === 'production') {
    setTimeout(updater, 2000);
  }

  // Win state keeper
  const state = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 1000
  });

  mainWindow = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    icon: path.join(__dirname, '/images/sspu_icon.png'),
    webPreferences: { nodeIntegration: true },
    show: true
  });

  if (process.env.NODE_ENV === 'production') {
    mainWindow.setMenu(null);
  }

  // mainWindow.webContents.openDevTools();
  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
    workerWindow = null;
    progressWindow = null;
  });

  mainWindow.webContents.on('did-finish-load', () => {
    // eslint-disable-next-line no-use-before-define
    // createProgressWindow('test');
    // mainWindow.show();
  });

  state.manage(mainWindow);
}

// WORKER WINDOW
function createWorkerWindow(command) {
  if (process.env.NODE_ENV === 'production') {
    workerWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: true
      }
    });
  } else {
    workerWindow = new BrowserWindow({
      width: 1200,
      height: 1080,
      x: 1200,
      y: 50,
      webPreferences: {
        nodeIntegration: true
      }
    });
  }

  workerWindow.loadFile('worker.html');

  if (process.env.NODE_ENV !== 'production') {
    workerWindow.once('ready-to-show', () => {
      workerWindow.show();
    });
  }

  // once worker is ready we send command to execute action
  workerWindow.webContents.on('did-finish-load', () => {
    workerWindow.webContents.send(command);
    // progressWindow.show();
  });

  workerWindow.webContents.openDevTools();
  workerWindow.on('close', function() {
    workerWindow = null;
  });
}

// ACTION WINDOW is used to display current activty and progress
function createProgressWindow(command) {
  // create browser window
  progressWindow = new BrowserWindow({
    parent: mainWindow,
    webPreferences: {
      nodeIntegration: true
    },
    modal: true,
    // frame: false,
    // resizable: false,
    width: 600,
    height: 250,
    x: 200,
    y: 200,
    title: 'Current activity',
    icon: path.join(__dirname, '/images/sspu_icon.png'),
    show: false
  });

  if (process.env.NODE_ENV === 'production') {
    progressWindow.setMenu(null);
  }

  // progressWindow.webContents.openDevTools();
  progressWindow.loadFile('progress.html');
  // progressWindow.once('ready-to-show', () => {
  //   progressWindow.show();
  // });
  progressWindow.on('close', function() {
    progressWindow = null;
    workerWindow.close();
    workerWindow = null;
  });

  // once action window is ready we create worker window
  progressWindow.webContents.on('did-finish-load', () => {
    createWorkerWindow(command);
  });
}

ipcMain.on('import-files', () => {
  createProgressWindow('import-files');
});

ipcMain.on('get-partsurfer-data', () => {
  createProgressWindow('get-partsurfer-data');
});

ipcMain.on('generate-reports', () => {
  createProgressWindow('generate-reports');
});

ipcMain.on('clear-database', () => {
  createProgressWindow('clear-database');
});

// forward set-progress events from worker to progress window
ipcMain.on('set-progress', (e, progressStatus) => {
  progressWindow.webContents.send('set-progress', progressStatus);
  if (!progressWindow.isVisible()) {
    progressWindow.show();
  }
});

// forward et-restart events from worker to progress window
ipcMain.on('set-restart', (e, curRestart, maxRestarts) => {
  // console.log(`Set restarts ${curRestart} / ${maxRestarts}`);
  progressWindow.webContents.send('set-restart', curRestart, maxRestarts);
});

ipcMain.on('finishedTask', () => {
  progressWindow.close(); // action window should handle worker
  mainWindow.webContents.send('reload');
  // mainWindow.webContents.send('rebuild-data');
});

app.on('ready', async () => {
  try {
    // await dbConnect();
    createWindow();
  } catch (err) {
    app.exit(-1);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', async () => {
  if (mainWindow === null) {
    try {
      // await dbConnect();
      createWindow();
    } catch (err) {
      app.exit(-1);
    }
  }
});
