const Store = require('electron-store');
const path = require('path');

class ConfigStore extends Store {
  constructor() {
    super({});
    // super({encryptionKey: "FLGoxz7uQwQJbqNkZpN8"})
    // this.stockFile = this.get('stockFile') || null;
    this.dataFiles = this.get('dataFiles');
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
}

module.exports = ConfigStore;
