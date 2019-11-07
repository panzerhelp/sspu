// const { remote } = require('electron');
const { shell } = require('electron');

document.title = `SSPU v.${process.env.npm_package_version}`;
const configFileController = require('./controllers/configFilesController');
const dataFileController = require('./controllers/dataFileController');
const FileImport = require('./frontend-js/modules/FileImport');

// eslint-disable-next-line no-unused-vars
const openFile = id => {
  const file = configFileController.getFileById(id);
  shell.openItem(file.filePath);
};

const init = () => {
  // eslint-disable-next-line no-new
  new FileImport();
};

// eslint-disable-next-line no-unused-vars
const clearFile = fileType => {
  const fileName = document.getElementById(`${fileType}Path`).textContent;
  configFileController.clearFileFromConfig(fileName, fileType);
  init();
};

// eslint-disable-next-line no-unused-vars
const selectFile = fileType => {
  const file = configFileController.selectFile(`${fileType}`);
  if (file) init();
};

// eslint-disable-next-line no-unused-vars
const importFiles = () => {
  dataFileController.importFiles();
};

if (document.getElementById('file-import-block')) {
  init();
}
