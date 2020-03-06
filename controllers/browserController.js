const Browser = require('../models/Browser');
const configFilesController = require('../controllers/configFilesController');

exports.concurrency = configFilesController.getScanWinNum();

exports.instances = [];

exports.createBrowsers = () => {
  for (let i = 0; i < this.concurrency; i++) {
    this.instances.push(new Browser());
  }
};

exports.closeBrowsers = () => {
  this.instances.forEach(b => {
    if (b) {
      b.close();
    }
  });

  this.instances = [];
};
