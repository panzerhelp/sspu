const Sequelize = require('sequelize');
const db = require('../db');
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

exports.getSingleProductDataFromPartSurfer = async product => {
  const page = await this.browser.openNewPage(
    `https://partsurfer.hpe.com/Search.aspx?SearchText=${product.productNumber}`
  );

  const isValidProduct = await page.evaluate(() =>
    document.getElementById('ctl00_BodyContentPlaceHolder_aGeneral')
  );

  if (!isValidProduct) {
    await product.update({ scanStatus: 'NOT_VALID_PRODUCT' });
  } else {
    await page.waitForSelector('#ctl00_BodyContentPlaceHolder_aAdvanced');

    // grab general tab
    const partsGenTab = await page.evaluate(() => {
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
    });

    // navigate to advance tab
    await Promise.all([
      page.click('#ctl00_BodyContentPlaceHolder_aAdvanced'),
      page.waitForNavigation({ timeout: 120000 })
    ]);

    await page.waitForSelector('#ctl00_BodyContentPlaceHolder_tdSpareBOM');

    // grab advanced tab
    const partsAdvTab = await page.evaluate(() => {
      const partNumber = Array.from(
        document.querySelectorAll('span[id$="spart1"]')
      ).map(el => {
        return el.textContent;
      });
      const description = Array.from(
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
            description: description[i],
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
    });

    // const merged = { ...partsGenTab, ...partsAdvTab };
    // console.log(partsGenTab);
    // console.log(partsAdvTab);
    // console.log(merged);

    const partsAdded = await partController.addPartsFromPartSurfer({
      ...partsGenTab,
      ...partsAdvTab
    });
    console.log(partsAdded);

    debugger;
  }

  await page.close();
};

exports.getProductDataFromPartSurfer = async () => {
  // temporary clean scan flags and product parts data
  await ProductPart.destroy({
    where: {},
    truncate: true
  });

  await db.query("UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='productParts'");
  await Product.update(
    {
      scanStatus: null
    },
    {
      where: {
        // scanStatus: {
        //   [Sequelize.Op.ne]: null
        // }
      }
    }
  );

  // temporary
  const productsToScan = await Product.findAll({ where: { scanStatus: null } });
  this.browser = new Browser();
  await this.browser.init();

  // eslint-disable-next-line no-restricted-syntax
  for (const product of productsToScan) {
    await this.getSingleProductDataFromPartSurfer(product);
  }
};
