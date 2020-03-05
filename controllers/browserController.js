const Browser = require('../models/Browser');

exports.concurrency = 3;

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
