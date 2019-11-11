const puppeteer = require('puppeteer');

const getChromiumExecPath = () => {
  return puppeteer.executablePath().replace('app.asar', 'app.asar.unpacked');
};

class Browser {
  constructor() {
    this.instance = null;
  }

  async init() {
    if (!this.instance) {
      this.instance = await puppeteer.launch({
        headless: false,
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

  openNewPage(url) {
    return new Promise((resolve, reject) => {
      if (this.instance) {
        const cookies = [
          {
            name: 'country',
            value: 'Eastern Europe',
            domain: 'partsurfer.hpe.com'
          }
        ];
        // const page = await
        this.instance
          .newPage()
          .then(page => {
            page
              .setViewport({ width: 1366, height: 1080 })
              .then(() => {
                page
                  .setCookie(...cookies)
                  .then(() => {
                    page
                      .goto(url, { waitUntil: 'load', timeout: 0 })
                      .then(() => {
                        resolve(page);
                      })
                      .catch(err => reject(err));
                  })
                  .catch(err => reject(err));
              })
              .catch(err => reject(err));
          })
          .catch(err => reject(err));
      } else {
        reject(new Error('Browser instance is not defined'));
      }
    });
  }
}
module.exports = Browser;
