const fs = require('fs');
const path = require('path');
const { shell } = require('electron');

const configController = require('../../controllers/configFilesController');

class ReportFiles {
  constructor() {
    this.fileList = document.getElementById('fileList');
    this.injectHTML();
    this.events();
  }

  // events
  events() {}

  // methods
  injectHTML() {
    this.fileList.innerHTML = '';
    const reportFolder = configController.getReportDir();
    fs.readdir(reportFolder, (err, files) => {
      files.forEach(file => {
        if (path.extname(file) === '.xlsx') {
          const div = document.createElement('div');
          const a = document.createElement('a');
          a.href = '#';

          a.addEventListener('click', () => {
            shell.openItem(path.join(reportFolder, file));
          });

          a.textContent = path.basename(file);
          div.appendChild(a);
          this.fileList.appendChild(div);
        }
      });
    });
  }
}

module.exports = ReportFiles;
