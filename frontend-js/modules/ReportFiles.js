const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const configController = require('../../controllers/configFilesController');

dayjs.extend(customParseFormat);

class ReportFiles {
  constructor() {
    this.fileList = document.getElementById('fileList');
    this.contractExpireDate = document.getElementById('contractExpireDate');
    this.injectHTML();
    this.events();
  }

  // events
  events() {}

  setCustomContractExpireDate() {
    configController.setContractExpireDate(this.value);
  }

  // methods
  injectHTML() {
    const date = configController.getContractExpireDate();
    this.contractExpireDate.value = dayjs(date).format('YYYY-MM-DD');
    this.contractExpireDate.onchange = this.setCustomContractExpireDate;

    this.fileList.innerHTML = '';
    const reportFolder = configController.getReportDir();
    fs.readdir(reportFolder, (err, files) => {
      files.forEach(file => {
        if (path.extname(file) === '.xlsx' && path.basename(file)[0] !== '~') {
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
