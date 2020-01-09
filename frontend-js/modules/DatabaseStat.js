/* eslint-disable global-require */
// const Part = require('../../models/Part');
// const Stock = require('../../models/Stock');
const Product = require('../../models/Product');
const Serial = require('../../models/Serial');
const configFilesController = require('../../controllers/configFilesController');

class DatabaseStat {
  constructor() {
    this.dbProductScan = document.getElementById('dbProductScan');
    this.dbSerialScan = document.getElementById('dbSerialScan');
    this.clearDatabaseBtn = document.getElementById('clearDatabaseBtn');
    this.getPartSurferDataBtn = document.getElementById('getPartSurferDataBtn');
    this.showScanWindow = document.getElementById('showScanWindow');
    this.injectHTML();
    this.events();
  }

  // events
  events() {
    this.showScanWindow.addEventListener('click', () => {
      configFilesController.toggleShowScanWindow();
    });
  }

  // methods
  injectHTML() {
    this.init();
  }

  init() {
    ['Part', 'Stock', 'System', 'Product', 'Serial', 'Contract'].forEach(
      item => {
        // eslint-disable-next-line no-eval
        // eval(item)

        // eslint-disable-next-line import/no-dynamic-require
        require(`../../models/${item}`)
          .count()
          .then(count => {
            document.getElementById(`db${item}`).innerHTML = count.toString();
          });
      }
    );

    this.showScanWindow.checked = configFilesController.getShowScanWindow();

    this.getPartSurferDataBtn.setAttribute('disabled', 'true');

    Product.count({ where: { scanStatus: null } }).then(count => {
      this.dbProductScan.innerHTML = count.toString();
      this.dbProductScan.parentElement.style.backgroundColor =
        count > 0 ? '#fcc' : '#f4f4f4';
      if (count > 0) this.getPartSurferDataBtn.removeAttribute('disabled');
    });

    Serial.count({ where: { scanStatus: null } }).then(count => {
      this.dbSerialScan.innerHTML = count.toString();
      this.dbSerialScan.parentElement.style.backgroundColor =
        count > 0 ? '#fcc' : '#f4f4f4';
      if (count > 0) this.getPartSurferDataBtn.removeAttribute('disabled');
    });

    this.clearDatabaseBtn.style.visibility = 'visible';
  }
}

module.exports = DatabaseStat;
