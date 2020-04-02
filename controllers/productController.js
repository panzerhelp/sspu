/* eslint-disable no-restricted-syntax */
const { ipcRenderer } = require('electron');
const Product = require('../models/Product');
const Part = require('../models/Part');
const ProductPart = require('../models/ProductPart');
const partController = require('../controllers/partController');
const browserController = require('./browserController');
const configFilesController = require('../controllers/configFilesController');

exports.addOneProduct = product => {
  return new Promise((resolve, reject) => {
    Product.findCreateFind({
      where: { productNumber: product.productNumber },
      defaults: {
        description: product.description
      }
    })
      // eslint-disable-next-line no-unused-vars
      .then(([productdb, created]) => {
        resolve(productdb);
      })
      .catch(err => {
        reject(err);
      });
  });
};

exports.addProducts = async productsData => {
  try {
    const productIds = {};
    const tot = Object.keys(productsData).length;
    let cur = 1;
    for (const pn in productsData) {
      if ({}.hasOwnProperty.call(productsData, pn)) {
        ipcRenderer.send('set-progress', {
          mainItem: 'Importing products',
          subItem: `${pn}`,
          curItem: cur,
          totalItem: tot
        });

        cur++;

        const product = await this.addOneProduct({
          productNumber: pn,
          description: productsData[pn].description
        });

        productIds[pn] = product.id;
      }
    }

    return Promise.resolve(productIds);
  } catch (error) {
    return Promise.reject(error);
  }
};

const getPartsGeneralTab = page => {
  return new Promise((resolve, reject) => {
    page
      .evaluate(() => {
        const partNumber = Array.from(
          document.querySelectorAll('a[id*="lnkPartno"]')
        ).map(el => {
          return el.textContent;
        });
        const description = Array.from(
          document.querySelectorAll('span[id*="lbldesc"]')
        ).map(el => {
          return el.textContent;
        });
        const csr = Array.from(
          document.querySelectorAll('span[id*="lblcsr"]')
        ).map(el => {
          return el.textContent;
        });

        return partNumber
          .map((pn, i) => ({
            key: pn,
            value: {
              partNumber: pn,
              description: description[i],
              descriptionShort: '',
              category: '',
              mostUsed: '',
              csr: csr[i]
            }
          }))
          .reduce((map, obj) => {
            // eslint-disable-next-line no-param-reassign
            map[obj.key] = obj.value;
            return map;
          }, {});
      })
      .then(partsGenTab => resolve(partsGenTab))
      .catch(err => reject(err));
  });
};

const getPartsAdvancedTab = page => {
  return new Promise((resolve, reject) => {
    page
      .evaluate(() => {
        const partNumber = Array.from(
          document.querySelectorAll('span[id$="spart1"]')
        ).map(el => {
          return el.textContent;
        });
        const descriptionShort = Array.from(
          document.querySelectorAll('span[id$="lblspartdesc1"]')
        ).map(el => {
          return el.textContent;
        });
        // const descE = Array.from(document.querySelectorAll('span[id$="lblspartdesc1_Enhanced"]')).map((el) => { return el.textContent; });
        const category = Array.from(
          document.querySelectorAll('span[id$="lblCategory1"]')
        ).map(el => {
          return el.textContent;
        });
        const mostUsed = Array.from(
          document.querySelectorAll('span[id$="lblMostUsed"]')
        ).map(el => {
          return el.textContent;
        });
        const csr = Array.from(
          document.querySelectorAll('span[id$="lblCSR1"]')
        ).map(el => {
          return el.textContent;
        });

        return partNumber
          .map((pn, i) => ({
            key: pn,
            value: {
              partNumber: pn,
              description: '',
              descriptionShort: descriptionShort[i],
              category: category[i],
              mostUsed: mostUsed[i],
              csr: csr[i]
            }
          }))
          .reduce((map, obj) => {
            // eslint-disable-next-line no-param-reassign
            map[obj.key] = obj.value;
            return map;
          }, {});
      })
      .then(partsAdvanceTab => resolve(partsAdvanceTab))
      .catch(err => reject(err));
  });
};

const processPartPage = async (product, page) => {
  try {
    await page.waitForSelector('#ctl00_BodyContentPlaceHolder_aAdvanced');
    const partsGenTab = await getPartsGeneralTab(page);
    await Promise.all([
      page.click('#ctl00_BodyContentPlaceHolder_aAdvanced'),
      page.waitForNavigation({ timeout: 300000 })
    ]);

    await page.waitForSelector('#ctl00_BodyContentPlaceHolder_tdSpareBOM');
    const partsAdvTab = await getPartsAdvancedTab(page);

    Object.keys(partsAdvTab).forEach(key => {
      if (typeof partsGenTab[key] !== 'undefined') {
        // eslint-disable-next-line no-param-reassign
        partsAdvTab[key].description = partsGenTab[key].description;
      }
    });

    let partsAdded;

    // check if parts from generat tab should be added
    // also add if advanced tab is empty
    if (
      configFilesController.getScanGeneralProductTab() ||
      (Object.keys(partsAdvTab).length === 0 &&
        partsAdvTab.constructor === Object)
    ) {
      partsAdded = await partController.addPartsFromPartSurfer({
        ...partsGenTab,
        ...partsAdvTab
      });
    } else {
      partsAdded = await partController.addPartsFromPartSurfer({
        ...partsAdvTab
      });
    }

    const productParts = [];
    partsAdded.forEach(part =>
      productParts.push({
        productId: product.id,
        partId: part.id
      })
    );

    await ProductPart.destroy({
      where: { productId: product.id }
    });

    await ProductPart.bulkCreate(productParts);
    await product.update({ scanStatus: 'SCANNED' });

    return Promise.resolve('SCANNED');
  } catch (error) {
    return Promise.reject(error);
  }
};

const inputProductNumber = async (productNumber, page) => {
  try {
    const input = await page.$(
      '#ctl00_BodyContentPlaceHolder_SearchText_TextBox1'
    );

    await input.click({ clickCount: 3 });
    await input.type(productNumber);
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.getSingleProductDataFromPartSurfer = async (product, browserId) => {
  try {
    const browser = browserController.instances[browserId];
    await browser.init();

    // const page = await browser.openNewPage(
    //   `https://partsurfer.hpe.com/Search.aspx?type=PROD&SearchText=${product.productNumber}`
    // );

    const page = await browser.openNewPage(`https://partsurfer.hpe.com/`);
    await inputProductNumber(product.productNumber, page);
    await Promise.all([
      page.click('#ctl00_BodyContentPlaceHolder_SearchText_btnSubmit'),
      page.waitForNavigation({ timeout: 300000 })
    ]);

    const isValid = await page.evaluate(() =>
      document.getElementById('ctl00_BodyContentPlaceHolder_aGeneral')
    );

    let result;
    if (!isValid) {
      await product.update({ scanStatus: 'NOT_VALID_PRODUCT' });
    } else {
      result = await processPartPage(product, page);
    }

    await page.close();
    await browser.close();
    return Promise.resolve(isValid ? result : 'NOT_VALID_PRODUCT');
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.totalProductsToScan = 0;
exports.curProductItem = 0;

exports.getProductDataFromPartSurfer = async () => {
  //   // temporary clean scan flags and product parts data
  //   await ProductPart.destroy({
  //     where: {},
  //     truncate: true
  //   });

  //   await db.query("UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='productParts'");
  //   await Product.update(
  //     {
  //       scanStatus: null
  //     },
  //     {
  //       where: {
  //         // scanStatus: {
  //         //   [Sequelize.Op.ne]: null
  //         // }
  //       }
  //     }
  //   );

  //   // temporary
  const productsToScan = await Product.findAll({ where: { scanStatus: null } });

  if (!productsToScan || !productsToScan.length) {
    return;
  }

  const { concurrency } = browserController;
  browserController.closeBrowsers();
  browserController.createBrowsers();

  let promiseArray = [];
  // let curItem = 0;
  let scanList = [];
  let browserId = 0;

  if (this.totalProductsToScan < 1) {
    this.totalProductsToScan = productsToScan.length;
    this.curProductItem = 0;
  }

  for (const product of productsToScan) {
    scanList.push(product.productNumber);

    promiseArray.push(
      this.getSingleProductDataFromPartSurfer(product, browserId)
    );
    browserId++;
    // curItem++;
    this.curProductItem++;

    if (promiseArray.length === concurrency) {
      ipcRenderer.send('set-progress', {
        mainItem: 'Getting product data',
        subItem: scanList.join(' '),
        curItem: this.curProductItem,
        totalItem: this.totalProductsToScan
      });
      await Promise.all(promiseArray);
      promiseArray = [];
      scanList = [];
      browserId = 0;
    }
  }

  if (promiseArray.length) {
    ipcRenderer.send('set-progress', {
      mainItem: 'Getting product data',
      subItem: scanList.join(' '),
      curItem: this.curProductItem,
      totalItem: productsToScan.length
    });

    await Promise.all(promiseArray);
  }

  browserController.closeBrowsers();
};

exports.clearExcludeFlags = async () => {
  try {
    await Product.update({ exclude: false }, { where: {} });
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.setExcludeFlags = async products => {
  try {
    for (const product of products) {
      if (product && typeof product.productNumber !== 'undefined') {
        const result = await Product.update(
          { exclude: true },
          { where: { productNumber: product.productNumber } }
        );

        console.log(result);
      }
    }
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.findOneProductById = async productId => {
  try {
    const product = await Product.findOne({
      where: { id: productId },
      include: [{ model: Part, where: { exclude: false } }]
    });
    return Promise.resolve(product);
  } catch (error) {
    return Promise.reject(error);
  }
};
