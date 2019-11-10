const puppeteer = require('puppeteer');

const getChromiumExecPath = () => {
  return puppeteer.executablePath().replace('app.asar', 'app.asar.unpacked');
};

class Browser {
  constructor() {
    this.instance = null;
    this.cookies = {
      name: 'country',
      value: 'Eastern Europe',
      domain: 'partsurfer.hpe.com'
    };
  }

  async init() {
    if (!this.instance) {
      this.instance = await puppeteer.launch({
        headless: false,
        devtools: true,
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

  async openNewPage(url) {
    if (this.instance) {
      const page = await this.instance.newPage();
      await page.setViewport({ width: 1366, height: 1080 });
      await page.setCookie(...this.cookies);
      await page.goto(url);
      return page;
    }
    return null;
  }
}

module.exports = Browser;
