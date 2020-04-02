/* eslint-disable no-unused-vars */
/* eslint-disable no-new */
const { shell, ipcRenderer, remote } = require('electron');

const version = remote.app.getVersion();

document.title = `SSPU v${version}`;
const configFileController = require('./controllers/configFilesController');
const FileImport = require('./frontend-js/modules/FileImport');
const DatabaseStat = require('./frontend-js/modules/DatabaseStat');
const ReportFiles = require('./frontend-js/modules/ReportFiles');
// const dbConnect = require('./dbConnect');
// const db = require('./db');

const init = () => {
  new FileImport();
  new DatabaseStat();
  new ReportFiles();
};

const openFile = id => {
  const file = configFileController.getFileById(id);
  shell.openItem(file.filePath);
};

const clearFile = fileType => {
  const fileName = document.getElementById(`${fileType}Path`).name;
  configFileController.clearFileFromConfig(fileName, fileType);
  init();
};

const selectFile = fileType => {
  const file = configFileController.selectFile(`${fileType}`);
  if (file) init();
};

const selectDataDir = async () => {
  if (configFileController.setDataDir()) {
    remote.app.relaunch();
    remote.app.exit();
  }
};

const importFiles = () => {
  ipcRenderer.send('import-files');
};

const getPartSurferData = () => {
  ipcRenderer.send('get-partsurfer-data');
};

const generateReports = () => {
  ipcRenderer.send('generate-reports');
};

const clearDatabase = () => {
  // document.getElementById('clearDatabaseBtn').style.visibility = 'hidden';
  ipcRenderer.send('clear-database');
};

if (document.getElementById('file-import-block')) {
  init();
}

ipcRenderer.on('reload', () => {
  init();
});
