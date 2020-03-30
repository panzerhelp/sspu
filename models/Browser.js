const puppeteer = require('puppeteer');
const configFilesController = require('../controllers/configFilesController');

const getChromiumExecPath = () => {
  return puppeteer.executablePath().replace('app.asar', 'app.asar.unpacked');
};

class Browser {
  constructor() {
    this.instance = null;
  }

  // headless when true it won't show puppeteer window
  // always false in non-production
  // in production it check showScanValue

  async init() {
    if (!this.instance) {
      this.instance = await puppeteer.launch({
        headless:
          process.env.NODE_ENV === 'production' &&
          !configFilesController.getShowScanWindow(),
        // devtools: true,
        executablePath: getChromiumExecPath()
      });
    }
  }

  async close() {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }

  async checkDropDown(page) {
    const checked = await page.evaluate(() => {
      const el = document.querySelector('option[value="EE"');
      if (!el) {
        return true;
      }
      return el.selected;
    });

    if (!checked) {
      // disable popup script
      await page.evaluate(() => {
        const el = document.getElementById(
          'ctl00_BodyContentPlaceHolder_ddlCountry'
        );
        el.onchange = null;
        return el;
      });

      // set value for the drop down
      await page.select('#ctl00_BodyContentPlaceHolder_ddlCountry', 'EE');
    }
  }

  async openNewPage(url, disableDropDownCheck) {
    if (this.instance) {
      const cookies = [
        {
          name: 'country',
          value: 'Eastern Europe',
          domain: 'partsurfer.hpe.com'
        }
      ];

      try {
        const page = await this.instance.newPage();
        await page.setViewport({ width: 1400, height: 1080 });
        await page.setCookie(...cookies);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });

        if (!disableDropDownCheck) {
          await this.checkDropDown(page);
        }

        return Promise.resolve(page);
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return Promise.reject(new Error('Browser instance is not defined'));
  }
}
module.exports = Browser;
