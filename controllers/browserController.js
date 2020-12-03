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

const DEFAULT_BROWSER_TIMEOUT = 120000; // 2 minutes

exports.checkTimeout = async (
  timeOutInMilliseconds = DEFAULT_BROWSER_TIMEOUT
) =>
  new Promise((resolve, reject) => {
    const wait = setTimeout(() => {
      clearTimeout(wait);
      reject(new Error('Timed out after 2 min..'));
    }, timeOutInMilliseconds);
  });

const SUBMIT_SELECTOR = '#ctl00_BodyContentPlaceHolder_SearchText_btnSubmit';

exports.clickSubmit = async page => {
  await Promise.all([
    Promise.race([
      page.click(SUBMIT_SELECTOR),
      page.click(SUBMIT_SELECTOR),
      page.click(SUBMIT_SELECTOR)
    ]),
    page.waitForNavigation({ timeout: 300000 })
  ]);
};
