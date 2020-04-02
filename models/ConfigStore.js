const Store = require('electron-store');
const path = require('path');
const fs = require('fs');
const electron = require('electron');

const app = electron.remote ? electron.remote.app : electron.app;

class ConfigStore extends Store {
  constructor() {
    super({});
    // super({encryptionKey: "FLGoxz7uQwQJbqNkZpN8"})
    this.dataFiles = this.get('dataFiles') || [];
    this.set('dataFiles', this.dataFiles);

    this.importCountry = this.get('importCountry') || 'Lithuania';
    this.set('importCountry', this.importCountry);

    this.dataDir = this.get('dataDir') || this.getDefaulDataDir();
    this.set('dataDir', this.dataDir);

    this.contractExpireDate = this.get('contractExpireDate') || '';
    this.set('contractExpireDate', this.contractExpireDate);

    this.showScanWindow = this.get('showScanWindow') || false;
    this.set('showScanWindow', this.showScanWindow);

    this.scanWinNum = this.get('scanWinNum') || '3';
    this.set('scanWinNum', this.scanWinNum);

    this.maxScanRestarts = this.get('maxScanRestarts') || '10000';
    this.set('maxScanRestarts', this.maxScanRestarts);

    this.scanGeneralProductTab = this.get('scanGeneralProductTab') || false;
    this.set('scanGeneralProductTab', this.scanGeneralProductTab);

    this.skipFullyRejectedContracts =
      this.get('skipFullyRejectedContracts') || false;
    this.set('skipFullyRejectedContracts', this.skipFullyRejectedContracts);
  }

  addDataFile(dataFile) {
    let exist = false;

    if (this.dataFiles === undefined) {
      this.dataFiles = [];
    }
    this.dataFiles.forEach(df => {
      if (dataFile.type === df.type && df.filePath === dataFile.filePath) {
        exist = true;
      }
    });

    if (!exist) {
      this.dataFiles.push(dataFile);
      this.set('dataFiles', this.dataFiles);
    }
  }

  removeDataFile(fileName, fileType) {
    let index = -1;

    for (let i = 0; i < this.dataFiles.length; i++) {
      if (
        this.dataFiles[i].type === fileType &&
        path.basename(this.dataFiles[i].filePath) === fileName
      ) {
        index = i;
        break;
      }
    }

    if (index !== -1) {
      this.dataFiles.splice(index, 1);
      this.set('dataFiles', this.dataFiles);
    }
  }

  getDefaulDataDir() {
    const dir = path.join(app.getPath('documents'), 'sspu');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    return dir;
  }

  setValue(key, value) {
    this.key = value;
    this.set(key, value);
  }
}

module.exports = ConfigStore;
