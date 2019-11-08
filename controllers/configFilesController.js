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
      { name: 'Excel Files', extensions: ['xlsx'] },
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  let dataFile;

  if (filePath && filePath.length > 0) {
    dataFile = new DataFile(filePath[0], fileType);
    configStore.addDataFile(dataFile);
  }

  return dataFile;
};

exports.selectAllFilesFromConfig = () => {
  return configStore.get('dataFiles');
};

exports.clearFileFromConfig = (fileName, fileType) => {
  configStore.removeDataFile(fileName, fileType);
};

exports.getFileById = id => {
  let fileById;
  configStore.get('dataFiles').forEach(file => {
    if (file.id === id) {
      fileById = file;
    }
  });
  return fileById;
};

exports.getImportCountry = () => {
  return configStore.get('importCountry');
};

exports.setImportCountry = importCountry => {
  configStore.setValue('importCountry', importCountry);
};

exports.getDataDir = () => {
  return configStore.get('dataDir');
};

exports.setDataDir = () => {
  const win = remote.getCurrentWindow();

  const dir = remote.dialog.showOpenDialogSync(win, {
    title: `Select Output Folder`,
    defaultPath: configStore.get('dataDir'),
    properties: ['openDirectory', 'promptToCreate']
  });

  if (dir && dir.length > 0) {
    configStore.setValue('dataDir', dir[0]);
    return dir[0];
  }

  return null;
};
