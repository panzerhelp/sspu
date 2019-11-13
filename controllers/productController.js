// const Sequelize = require('sequelize');
// const db = require('../db');
const { ipcRenderer } = require('electron');
const Product = require('../models/Product');
const ProductPart = require('../models/ProductPart');
const partController = require('../controllers/partController');
// const Part = require('../models/Part');
const Browser = require('../models/Browser');

exports.addOneProduct = product => {
  return new Promise((resolve, reject) => {
    Product.findCreateFind({
      where: { productNumber: product.productNumber },
      defaults: {
        description: product.description
      }
    })
      .then(([productdb, created]) => {
        resolve(productdb.dataValues);
      })
      .catch(err => {
        reject(err);
      });
  });
};

exports.addProducts = productsData => {
  return new Promise((resolve, reject) => {
    const promiseArray = [];

    Object.keys(productsData).forEach(productNumber => {
      promiseArray.push(
        this.addOneProduct({
          productNumber: productNumber,
          description: productsData[productNumber].description
        })
      );
    });

    Promise.all(promiseArray).then(
      products => {
        const productIds = Object.assign(
          {},
          ...products.map(product => ({ [product.productNumber]: product.id }))
        );
        resolve(productIds);
      },
      reason => {
        reject(reason);
        debugger;
      }
    );
  });
};

exports.browser = null;

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

    const partsAdded = await partController.addPartsFromPartSurfer({
      ...partsGenTab,
      ...partsAdvTab
    });

    const productParts = [];
    partsAdded.forEach(part =>
      productParts.push({
        productId: product.id,
        partId: part.id
      })
    );

    await ProductPart.bulkCreate(productParts);
    await product.update({ scanStatus: 'SCANNED' });

    return Promise.resolve('SCANNED');
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.getSingleProductDataFromPartSurfer = async product => {
  try {
    const page = await this.browser.openNewPage(
      `https://partsurfer.hpe.com/Search.aspx?type=PROD&SearchText=${product.productNumber}`
    );

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
    return Promise.resolve(isValid ? result : 'NOT_VALID_PRODUCT');
  } catch (error) {
    return Promise.reject(error);
  }
};

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
  this.browser = new Browser();
  await this.browser.init();

  // eslint-disable-next-line no-restricted-syntax
  // let promiseArray = [];
  const concurrency = 5;
  let curItem = 1;
  // let subItems = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const product of productsToScan) {
    ipcRenderer.send('set-progress', {
      mainItem: 'Getting product data',
      subItem: product.productNumber,
      curItem: curItem,
      totalItem: productsToScan.length
    });
    await this.getSingleProductDataFromPartSurfer(product);
    curItem++;
  }

  // // eslint-disable-next-line no-restricted-syntax
  // for (const product of productsToScan) {
  //   if (promiseArray.length < concurrency) {
  //     promiseArray.push(this.getSingleProductDataFromPartSurfer(product));
  //     curItem++;
  //     subItems.push(product.productNumber);
  //   } else {
  //     ipcRenderer.send('set-progress', {
  //       mainItem: 'Getting product data',
  //       subItem: subItems.join(' '),
  //       curItem: curItem,
  //       totalItem: productsToScan.length
  //     });

  //     await Promise.all(promiseArray);
  //     promiseArray = [];
  //     subItems = [];
  //   }
  // }

  // if (promiseArray.length > 0) {
  //   await Promise.all(promiseArray);
  // }
};
