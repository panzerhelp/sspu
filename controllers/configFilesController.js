const { remote } = require('electron');
const path = require('path');
const fs = require('fs');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const DataFile = require('../models/DataFile');
const ConfigStore = require('../models/ConfigStore');

dayjs.extend(customParseFormat);

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

exports.getReportDir = () => {
  const dir = path.join(this.getDataDir(), 'reports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  const outdir = path.join(dir, this.getImportCountry());
  if (!fs.existsSync(outdir)) fs.mkdirSync(outdir);

  return outdir;
};

exports.getOutputFile = type => {
  const fileNames = {
    stockUsage: 'Stock Usage Report.xlsx',
    contractUsage: 'Contract Usage Report.xlsx',
    productUsage: 'Product Usage Report.xlsx'
  };

  const outdir = this.getReportDir();
  return path.join(outdir, `${this.getImportCountry()} ${fileNames[type]}`);
};

exports.setContractExpireDate = date => {
  // clear custom date when set to today
  if (date === dayjs().format('YYYY-MM-DD')) {
    configStore.setValue('contractExpireDate', '');
  } else {
    configStore.setValue('contractExpireDate', date);
  }
};

exports.getContractExpireDate = () => {
  const date = configStore.get('contractExpireDate');

  if (!date) {
    return dayjs().format('YYYY-MM-DD');
  }

  return date;
};

exports.getShowScanWindow = () => {
  return configStore.get('showScanWindow');
};

exports.toggleShowScanWindow = () => {
  const showScanWindow = configStore.get('showScanWindow');
  configStore.setValue('showScanWindow', !showScanWindow);
};

exports.getScanGeneralProductTab = () => {
  return configStore.get('scanGeneralProductTab');
};

exports.toggleScanGeneralProductTab = () => {
  const scanGeneralProductTab = configStore.get('scanGeneralProductTab');
  configStore.setValue('scanGeneralProductTab', !scanGeneralProductTab);
};

exports.toggleSkipFullyRejectedContracts = () => {
  const skipFullyRejectedContracts = configStore.get(
    'skipFullyRejectedContracts'
  );
  configStore.setValue(
    'skipFullyRejectedContracts',
    !skipFullyRejectedContracts
  );
};

exports.getSkipFullyRejectedContracts = () => {
  return configStore.get('skipFullyRejectedContracts');
};

exports.getScanWinNum = () => {
  const num = configStore.get('scanWinNum');
  if (num) {
    return parseInt(num, 10);
  }

  return 0;
};

exports.setScanWinNum = num => {
  const maxValue = 6;
  configStore.setValue(
    'scanWinNum',
    Math.min(Math.max(1, num), maxValue).toString()
  );
};

exports.getMaxScanRestarts = () => {
  const num = configStore.get('maxScanRestarts');
  if (num) {
    return parseInt(num, 10);
  }

  return 0;
};

exports.setMaxScanRestarts = num => {
  const maxValue = 100000;
  configStore.setValue(
    'maxScanRestarts',
    Math.min(Math.max(0, num), maxValue).toString()
  );
};
