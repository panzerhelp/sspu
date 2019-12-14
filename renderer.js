/* eslint-disable no-unused-vars */
/* eslint-disable no-new */
const { shell, ipcRenderer } = require('electron');

document.title = `SSPU v.${process.env.npm_package_version}`;
const configFileController = require('./controllers/configFilesController');
const FileImport = require('./frontend-js/modules/FileImport');
const DatabaseStat = require('./frontend-js/modules/DatabaseStat');

const init = () => {
  new FileImport();
  new DatabaseStat();
};

const openFile = id => {
  const file = configFileController.getFileById(id);
  shell.openItem(file.filePath);
};

const clearFile = fileType => {
  const fileName = document.getElementById(`${fileType}Path`).textContent;
  configFileController.clearFileFromConfig(fileName, fileType);
  init();
};

const selectFile = fileType => {
  const file = configFileController.selectFile(`${fileType}`);
  if (file) init();
};

const selectDataDir = () => {
  if (configFileController.setDataDir()) init();
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
  document.getElementById('clearDatabaseBtn').style.visibility = 'hidden';
  ipcRenderer.send('clear-database');
};

if (document.getElementById('file-import-block')) {
  init();
}

ipcRenderer.on('reload', () => {
  init();
});
