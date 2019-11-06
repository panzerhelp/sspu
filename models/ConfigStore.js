const Store = require('electron-store');

class ConfigStore extends Store {
  constructor() {
    super({});
    // super({encryptionKey: "FLGoxz7uQwQJbqNkZpN8"})
    // this.stockFile = this.get('stockFile') || null;
  }

  setValue(key, value) {
    this.key = value;
    this.set(key, this.key);
  }

  getValue(key) {
    if (this.has(key)) return this.get(key);
    return null;
  }

  setStockFile(stockFile) {
    this.stockFile = stockFile;
    this.set('stockFile', this.stockFile);
  }

  clearKey(key) {
    // console.log('clearing key')
    console.log(key);
    this.delete(key);
  }
}

module.exports = ConfigStore;
