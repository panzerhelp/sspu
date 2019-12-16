const Store = require('electron-store');
const path = require('path');
const fs = require('fs');
const electron = require('electron');

const app = electron.remote ? electron.remote.app : electron.app;

// const { remote } = require('electron');

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
    this.set(key, this.key);
  }
}

module.exports = ConfigStore;
