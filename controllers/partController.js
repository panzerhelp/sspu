/* eslint-disable no-restricted-syntax */
const { ipcRenderer } = require('electron');
// const db = require('../db');
const Part = require('../models/Part');
const Stock = require('../models/Stock');
const Browser = require('../models/Browser');
const PartFieldEquiv = require('../models/PartFieldEquiv');

exports.addOnePartFromStock = part => {
  return new Promise((resolve, reject) => {
    Part.findCreateFind({
      where: { partNumber: part.partNumber },
      defaults: {
        description: part.description,
        price: part.price,
        stockQty: part.qty
      }
    })
      .then(([partdb, partCreated]) => {
        if (!partCreated) {
          const newQty = partdb.stockQty + part.qty;
          partdb.update({
            // update price for existing part
            price: part.price,
            stockQty: newQty
          });
        }

        Stock.findCreateFind({
          where: { partId: partdb.id },
          defaults: { qty: part.qty, caseUse: 0 }
        })
          .then(([stock, stockCreated]) => {
            if (!stockCreated) {
              const newQty = stock.qty + part.qty;
              stock
                .update({ qty: newQty })
                .then(() => resolve(part))
                .catch(err => reject(err));
            } else {
              resolve(part);
            }
          })
          .catch(err => reject(err));
      })
      .catch(err => {
        reject(err);
      });
  });
};

exports.addOnePart = part => {
  return new Promise((resolve, reject) => {
    Part.findCreateFind({
      where: { partNumber: part.partNumber },
      defaults: {
        description: part.description,
        descriptionShort: part.descriptionShort,
        csr: part.csr,
        category: part.category,
        mostUsed: part.mostUsed
      }
    })
      // eslint-disable-next-line no-unused-vars
      .then(([partdb, created]) => {
        resolve(partdb.dataValues);
      })
      .catch(err => reject(err));
  });
};

exports.addPartsFromPartSurfer = partObject => {
  return new Promise((resolve, reject) => {
    const promiseArray = [];
    Object.keys(partObject).forEach(key => {
      promiseArray.push(this.addOnePart(partObject[key]));
    });
    // partArray.forEach(part => promiseArray.push(this.addOnePartGenTab(part)));
    Promise.all(promiseArray).then(
      parts => {
        resolve(parts);
      },
      reason => {
        reject(reason);
      }
    );
  });
};

exports.browser = null;

const getPartFielEquiv = async part => {
  try {
    const page = await this.browser.openNewPage(
      `https://partsurfer.hpe.com/FunctionalEquivalent.aspx?spn=${part.partNumber}&country=EE`,
      'disableDropDownCheck'
    );

    const partsFound = await page.evaluate(() => {
      const partNumber = Array.from(
        document.querySelectorAll('span[id$="lblspart1"]')
      ).map(el => {
        return el.textContent;
      });
      const description = Array.from(
        document.querySelectorAll('span[id$="lblspartdesc1"]')
      ).map(el => {
        return el.textContent;
      });

      return partNumber.length
        ? partNumber
            .map((pn, i) => ({
              key: pn,
              value: {
                partNumber: pn,
                description: description[i],
                descriptionShort: '',
                category: '',
                mostUsed: '',
                csr: ''
              }
            }))
            .reduce((map, obj) => {
              // eslint-disable-next-line no-param-reassign
              map[obj.key] = obj.value;
              return map;
            }, {})
        : null;
    });

    if (partsFound) {
      const partsAdded = await this.addPartsFromPartSurfer(partsFound);

      const feParts = [];
      partsAdded.forEach(fePart =>
        feParts.push({
          fePartId: fePart.id,
          partId: part.id
        })
      );

      await PartFieldEquiv.bulkCreate(feParts);
      await part.update({ feScanStatus: `${feParts.length}` });
    } else {
      await part.update({ feScanStatus: `NO_FE` });
    }
    await page.close();
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.getFieldEquivFromPartSurfer = async () => {
  //   // temporary clean scan flags and product parts data
  // await PartFieldEquiv.destroy({
  //   where: {},
  //   truncate: true
  // });

  // await db.query(
  //   "UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='partFieldEquivs'"
  // );
  // await Part.update(
  //   {
  //     feScanStatus: null
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

  let iteration = 0;
  let partsToScen = await Part.findAll({ where: { feScanStatus: null } });

  while (partsToScen.length) {
    let curItem = 1;
    for (const part of partsToScen) {
      await getPartFielEquiv(part);
      ipcRenderer.send('set-progress', {
        mainItem: `Getting field equivalent data (${iteration})`,
        subItem: `${part.partNumber}`,
        curItem: curItem,
        totalItem: partsToScen.length
      });
      curItem++;
    }
    iteration++;
    partsToScen = await Part.findAll({ where: { feScanStatus: null } });
  }
};

exports.getPartFieldEquiv = async partId => {
  try {
    const fePartIds = [];

    const isFE = await PartFieldEquiv.findAll({
      where: { fePartId: partId }
    });

    isFE.forEach(i => fePartIds.push(i.partId));

    const hasFE = await PartFieldEquiv.findAll({
      where: { partId: partId }
    });

    hasFE.forEach(i => fePartIds.push(i.fePartId));

    let feParts = [];
    if (fePartIds) feParts = await Part.findAll({ where: { id: fePartIds } });

    return Promise.resolve(feParts);
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.getPartFieldEquivDirect = async partId => {
  try {
    const fePartIds = [];

    const hasFE = await PartFieldEquiv.findAll({
      where: { partId: partId }
    });

    hasFE.forEach(i => fePartIds.push(i.fePartId));

    let feParts = [];
    if (fePartIds) feParts = await Part.findAll({ where: { id: fePartIds } });

    return Promise.resolve(feParts);
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.getPartFieldEquivBack = async partId => {
  try {
    const fePartIds = [];

    const isFE = await PartFieldEquiv.findAll({
      where: { fePartId: partId }
    });

    isFE.forEach(i => fePartIds.push(i.partId));

    let feParts = [];
    if (fePartIds) feParts = await Part.findAll({ where: { id: fePartIds } });

    return Promise.resolve(feParts);
  } catch (error) {
    return Promise.reject(error);
  }
};
