/* eslint-disable no-restricted-syntax */
const { ipcRenderer } = require('electron');
const sequelize = require('sequelize');
const db = require('../db');
const System = require('../models/System');
const SystemPart = require('../models/SerialPart');
const Browser = require('../models/Browser');
const Product = require('../models/Product');
const Part = require('../models/Part');
const partController = require('./partController');
const serialController = require('./serialController');
const Contract = require('../models/Contract');

exports.addOneSystem = system => {
  return new Promise((resolve, reject) => {
    const serialList = system.serialList.join(',');

    System.findCreateFind({
      where: {
        contractId: system.contractId,
        productId: system.productId
      },
      defaults: {
        contractId: system.contractId,
        productId: system.productId,
        serialList: serialList,
        serialId: system.serialId
      }
    })
      .then(([systemdb, created]) => {
        console.log(
          created
            ? `Added system with serial list ${systemdb.serialList}`
            : `Updated system with serial ${systemdb.serialList}`
        );
        resolve(systemdb.dataValues);
      })
      .catch(err => {
        reject(err);
      });
  });
};

exports.addSystems = async (systemsData, productIds, contractIds) => {
  try {
    const tot = Object.keys(systemsData).length;
    let cur = 1;
    for (const i in systemsData) {
      if ({}.hasOwnProperty.call(systemsData, i)) {
        const sys = systemsData[i];

        ipcRenderer.send('set-progress', {
          mainItem: 'Importing systems',
          subItem: `${sys.contract} ${sys.product}`,
          curItem: cur,
          totalItem: tot
        });
        cur++;

        let serialId = null;

        if (sys.serialList.length) {
          serialId = await serialController.addSerialList(sys.serialList);
        }

        await this.addOneSystem({
          contractId: contractIds[sys.contract],
          productId: productIds[sys.product],
          serialList: sys.serialList,
          serialId: serialId
        });
      }
    }
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.clearSystems = () => {
  return new Promise((resolve, reject) => {
    System.destroy({
      where: {},
      truncate: true
    })
      .then(() => {
        db.query("UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='systems'")
          .then(resolve())
          .catch(err => reject(err));
      })
      .catch(err => reject(err));
  });
};

exports.browser = null;

const getSystemAdvancedTab = page => {
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
        // const descE = Array.from(
        //   document.querySelectorAll('span[id$="lblspartdesc1_Enhanced"]')
        // ).map(el => {
        //   return el.textContent;
        // });
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
      .then(partsAdvTab => resolve(partsAdvTab))
      .catch(err => reject(err));
  });
};

const getDataFromSystemPage = async (system, page) => {
  try {
    const spareBom = await page.evaluate(() =>
      document.getElementById('ctl00_BodyContentPlaceHolder_tdSpareBOM')
    );
    if (!spareBom) {
      await system.update({ scanStatus: 'NO_DATA' });
      return Promise.resolve('NO_DATA');
    }

    const partsAdvTab = await getSystemAdvancedTab(page);
    const partsAdded = await partController.addPartsFromPartSurfer(partsAdvTab);

    const systemParts = [];
    partsAdded.forEach(part =>
      systemParts.push({
        systemId: system.id,
        partId: part.id
      })
    );

    await SystemPart.bulkCreate(systemParts);

    await system.update({ scanStatus: 'SCANNED' });
    return Promise.resolve('SCANNED');
  } catch (error) {
    return Promise.reject(error);
  }
};

const checkForProductSelection = (system, page) => {
  return new Promise((resolve, reject) => {
    page
      .evaluate(product => {
        const radioButtons = document.querySelectorAll(
          'input[id^=ctl00_BodyContentPlaceHolder_radProd_]'
        );
        const select = [];
        let found = false;
        // eslint-disable-next-line no-restricted-syntax
        for (const rb of radioButtons) {
          let prodStr;
          // remove option;
          if (rb.value.indexOf('#') !== -1) {
            prodStr = rb.value.substr(0, rb.value.indexOf('#'));
          } else {
            prodStr = rb.value;
          }

          if (prodStr === product) {
            select.push({ product: rb.value, clicked: true });
            rb.click();
            found = true;
          } else {
            select.push({ product: rb.value, clicked: false });
          }
        }

        // product was not found, click firt radio button to unlock search.
        if (!found && radioButtons.length > 0) {
          radioButtons[0].click();
        }

        return select;
      }, system.product.productNumber)
      .then(select => resolve(select))
      .catch(err => reject(err));
  });
};

const processSystemPage = async (system, page) => {
  try {
    const select = await checkForProductSelection(system, page);
    let result;
    if (select.length > 0) {
      const itemFound = select.filter(obj => obj.clicked === true);

      if (!itemFound) {
        await system.update({ scanStatus: 'NO_DATA' });
        return Promise.resolve('NO_DATA');
      }

      await Promise.all([
        page.click('#ctl00_BodyContentPlaceHolder_btnProdSubmit'),
        page.waitForNavigation({ timeout: 300000 })
      ]);

      result = await getDataFromSystemPage(system, page);
    } else {
      result = await getDataFromSystemPage(system, page);
    }

    return Promise.resolve(result);
  } catch (error) {
    return Promise.reject(error);
  }
};

const inputSystemSerial = async (serial, page) => {
  try {
    const input = await page.$(
      '#ctl00_BodyContentPlaceHolder_SearchText_TextBox1'
    );
    await input.click({ clickCount: 3 });
    await input.type(serial);
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.getSingleSystemDataFromPartSurfer = async system => {
  try {
    const page = await this.browser.openNewPage(
      `https://partsurfer.hpe.com/Search.aspx?SearchText`
    );

    await inputSystemSerial(system.serial, page);

    await Promise.all([
      page.click('#ctl00_BodyContentPlaceHolder_SearchText_btnSubmit'),
      page.waitForNavigation({ timeout: 300000 })
    ]);

    const noData = await page.evaluate(() =>
      document.getElementById('ctl00_BodyContentPlaceHolder_lblNoDataFound')
    );

    if (noData) {
      await system.update({ scanStatus: 'NO_DATA' });
      await page.close();
      return Promise.resolve('NO_DATA');
    }

    await processSystemPage(system, page);
    await page.close();
    return Promise.resolve('SCANNED');
  } catch (error) {
    return Promise.reject(error);
  }
};

const getSystemArrayParts = async systemArr => {
  try {
    const result = await this.getSingleSystemDataFromPartSurfer(systemArr[0]);
    systemArr.forEach(system => {
      if (system.id !== systemArr[0].id) {
        system.update({
          scanStatus: result,
          partSystemId: systemArr[0].id
        });
      }
    });
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.getContractParts = async contract => {
  try {
    const systems = await System.findAll({
      where: { scanStatus: null, contractId: contract.id },
      include: [{ model: Product }],
      order: [[sequelize.literal('contractId, productId'), 'asc']]
    });

    if (systems.length > 0) {
      const productSystemMap = {};
      systems.forEach(system => {
        if (typeof productSystemMap[system.product.id] === 'undefined') {
          productSystemMap[system.product.id] = [];
        }
        productSystemMap[system.product.id].push(system);
      });
      const promiseArray = [];
      Object.keys(productSystemMap).forEach(product => {
        promiseArray.push(getSystemArrayParts(productSystemMap[product]));
      });

      await Promise.all(promiseArray);
      return Promise.resolve(`${systems.length} systems added`);
    }

    return Promise.resolve('No Systems Found');
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.getSystemDataFromPartSurfer = async () => {
  // temporary clean scan flags and product parts data
  // await SystemPart.destroy({
  //   where: {},
  //   truncate: true
  // });

  // await db.query("UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='systemParts'");
  // await System.update(
  //   {
  //     scanStatus: null
  //   },
  //   {
  //     where: {
  //       // scanStatus: {
  //       //   [Sequelize.Op.ne]: null
  //       // }
  //     }
  //   }
  // );

  this.browser = new Browser();
  await this.browser.init();
  let curItem = 1;
  const contracts = await Contract.findAll();
  for (const contract of contracts) {
    ipcRenderer.send('set-progress', {
      mainItem: 'Getting contract data',
      subItem: `SAID ${contract.said}`,
      curItem: curItem,
      totalItem: contracts.length
    });
    await this.getContractParts(contract);
    curItem++;
  }
};

exports.findSystemsWithPart = async partIds => {
  try {
    const systemParts = await System.findAll({
      where: { partSystemId: null, scanStatus: 'SCANNED' },
      include: [
        {
          model: Contract,
          required: true
        },
        {
          model: Product,
          required: true
        },
        {
          model: Part,
          where: { id: partIds },
          required: true
        }
      ]
    });

    const systemNoParts = await System.findAll({
      where: { partSystemId: null, scanStatus: 'NO_DATA' },
      include: [
        {
          model: Contract,
          required: true
        },
        {
          model: Product,
          required: true,
          include: [
            {
              model: Part,
              required: true,
              where: { id: partIds }
            }
          ]
        }
      ]
    });

    const systemIds = [];
    systemParts.forEach(s => systemIds.push(s.id));
    systemNoParts.forEach(s => systemIds.push(s.id));

    const systemLinked = await System.findAll({
      where: { partSystemId: systemIds },
      include: [
        {
          model: Contract,
          required: true
        },
        {
          model: Product,
          required: true
        }
      ]
    });

    const systems = [...systemParts, ...systemNoParts, ...systemLinked];
    return Promise.resolve(systems);
  } catch (error) {
    return Promise.reject(error);
  }
};
