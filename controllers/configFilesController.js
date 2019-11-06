const { remote } = require('electron');
const DataFile = require('../models/DataFile');
const ConfigStore = require('../models/ConfigStore');

const configStore = new ConfigStore();

exports.selectFile = fileType => {
  const win = remote.getCurrentWindow();

  const filePath = remote.dialog.showOpenDialogSync(win, {
    title: `Select ${fileType} File`,
    properties: ['openFile'],
    filters: [
      { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  let dataFile;

  if (filePath && filePath.length > 0) {
    dataFile = new DataFile(filePath[0], fileType);
    configStore.setValue(fileType, dataFile);
  }

  return dataFile;
};

exports.selectAllFilesFromConfig = () => {
  const selection = {};
  const files = ['stockFile', 'salesDataFile', 'priceFile'];
  files.forEach(file => {
    selection[file] = configStore.getValue(file);
  });
  return selection;
};

exports.clearFileFromConfig = fileType => {
  configStore.clearKey(fileType);
};
