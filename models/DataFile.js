const path = require('path');
const fs = require('fs');

class DataFile {
  constructor(filePath, type) {
    this.filePath = filePath;
    this.type = type;
    this.name = this.getFileName();
    this.size = this.getFileSize();
  }

  getFileName() {
    const parse = path.parse(this.filePath);
    return `${parse.name}${parse.ext}`;
  }

  getFileSize() {
    const stats = fs.statSync(this.filePath);
    return stats.size;
  }
}

module.exports = DataFile;
