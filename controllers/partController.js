/* eslint-disable no-prototype-builtins */
/* eslint-disable guard-for-in */
/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { Op } = require('sequelize');
const { ipcRenderer } = require('electron');
const Part = require('../models/Part');
const Stock = require('../models/Stock');
const Product = require('../models/Product');
const Serial = require('../models/Serial');
// const Stock = require('../models/Stock');
const PartFieldEquiv = require('../models/PartFieldEquiv');
const browserController = require('./browserController');

exports.addOnePartFromStock = part => {
  return new Promise((resolve, reject) => {
    Part.findCreateFind({
      where: { partNumber: part.partNumber },
      defaults: {
        description: part.description,
        price: part.price,
        stockQty: part.qty || 0
      }
    })
      .then(([partdb, partCreated]) => {
        if (!partCreated) {
          partdb.stockQty += part.qty;
          if (part.description) {
            partdb.description = part.description;
          }
          partdb.save();
          // const newQty = partdb.stockQty + part.qty;
          // partdb.update({
          //   // update price for existing part
          //   price: part.price,
          //   stockQty: newQty
          // });
        }
        resolve(partdb);
        // Stock.findCreateFind({
        //   where: { partId: partdb.id },
        //   defaults: { qty: part.qty, caseUse: 0 }
        // })
        //   .then(([stock, stockCreated]) => {
        //     if (!stockCreated) {
        //       const newQty = stock.qty + part.qty;
        //       stock
        //         .update({ qty: newQty })
        //         .then(() => resolve(part))
        //         .catch(err => reject(err));
        //     } else {
        //       resolve(part);
        //     }
        //   })
        //   .catch(err => reject(err));
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

const getPartFielEquiv = async (part, browserId) => {
  try {
    const browser = browserController.instances[browserId];
    await browser.init();
    const page = await browser.openNewPage(
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

      await PartFieldEquiv.bulkCreate(feParts, { ignoreDuplicates: true });
      await part.update({ feScanStatus: `${feParts.length}` });
    } else {
      await part.update({ feScanStatus: `NO_FE` });
    }
    await page.close();
    await browser.close();
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

  let iteration = 0;
  let partsToScen = await Part.findAll({ where: { feScanStatus: null } });

  const { concurrency } = browserController;
  browserController.closeBrowsers();
  browserController.createBrowsers();

  let promiseArray = [];
  let scanList = [];
  let browserId = 0;

  while (partsToScen.length) {
    let curItem = 0;
    for (const part of partsToScen) {
      scanList.push(part.partNumber);

      promiseArray.push(getPartFielEquiv(part, browserId));
      browserId++;
      curItem++;

      if (promiseArray.length === concurrency) {
        ipcRenderer.send('set-progress', {
          mainItem: `Getting field equivalent data (${iteration})`,
          subItem: scanList.join(' '),
          curItem: curItem,
          totalItem: partsToScen.length
        });

        await Promise.all(promiseArray);
        promiseArray = [];
        scanList = [];
        browserId = 0;
      }
    }

    if (promiseArray.length) {
      ipcRenderer.send('set-progress', {
        mainItem: `Getting field equivalent data (${iteration})`,
        subItem: scanList.join(' '),
        curItem: curItem,
        totalItem: partsToScen.length
      });

      await Promise.all(promiseArray);
      promiseArray = [];
      scanList = [];
      browserId = 0;
    }

    iteration++;
    partsToScen = await Part.findAll({ where: { feScanStatus: null } });
  }
};

exports.connectFieldEquivParts = async () => {
  await PartFieldEquiv.destroy({ where: { addedByCode: true } });

  let keepSearching = true;

  while (keepSearching) {
    keepSearching = false;
    // retrieve all parts with equivivalents
    const parts = await Part.findAll({
      where: { feScanStatus: { [Op.not]: 'NO_FE' } }
    });

    for (const part of parts) {
      // find all FE for the part
      const feParts = await PartFieldEquiv.findAll({
        where: { partId: part.id }
      });

      // scan FE of FE (next FE parts)
      for (const fePart of feParts) {
        const nextFeParts = await PartFieldEquiv.findAll({
          where: { partId: fePart.fePartId }
        });

        for (const nextFePart of nextFeParts) {
          if (
            nextFePart.fePartId !== fePart.partId &&
            !feParts.find(p => p.fePartId === nextFePart.fePartId)
          ) {
            // console.log(
            //   `Insert new FE entry. PartId ${part.id} - FEPartId ${nextFePart.fePartId}`
            // );

            await PartFieldEquiv.findCreateFind({
              where: { partId: part.id, fePartId: nextFePart.fePartId },
              defaults: {
                addedByCode: true
              }
            });

            keepSearching = true;
          }
        }
      }
    }
  }
};

const getFieldEquivDirect = async (partId, fePartIds = []) => {
  const feParts = await PartFieldEquiv.findAll({
    where: { partId: partId }
  });

  const directPartFeIds = feParts.map(p => p.fePartId);
  const partsToScan = [];
  for (const p of directPartFeIds) {
    if (!fePartIds.includes(p)) {
      fePartIds.push(p);
      partsToScan.push(p);
    }
  }

  for (const p of partsToScan) {
    await getFieldEquivDirect(p, fePartIds);
  }
  return fePartIds;
};

exports.getPartFieldEquiv = async partId => {
  try {
    let fePartIds = [];

    const isFE = await PartFieldEquiv.findAll({
      where: { fePartId: partId }
    });

    isFE.forEach(i => fePartIds.push(i.partId));

    // const hasFE = await PartFieldEquiv.findAll({
    //   where: { partId: partId }
    // });

    // hasFE.forEach(i => fePartIds.push(i.fePartId));

    fePartIds = [...fePartIds, ...(await getFieldEquivDirect(partId))];

    let feParts = [];
    if (fePartIds) feParts = await Part.findAll({ where: { id: fePartIds } });

    return Promise.resolve(feParts);
  } catch (error) {
    return Promise.reject(error);
  }
};

// exports.getPartFieldEquivDirect = async partId => {
//   try {
//     const fePartIds = [];

//     const hasFE = await PartFieldEquiv.findAll({
//       where: { partId: partId }
//     });

//     hasFE.forEach(i => fePartIds.push(i.fePartId));

//     let feParts = [];
//     if (fePartIds) feParts = await Part.findAll({ where: { id: fePartIds } });

//     return Promise.resolve(feParts);
//   } catch (error) {
//     return Promise.reject(error);
//   }
// };

// exports.getPartFieldEquivBack = async partId => {
//   try {
//     const fePartIds = [];

//     const isFE = await PartFieldEquiv.findAll({
//       where: { fePartId: partId }
//     });

//     isFE.forEach(i => fePartIds.push(i.partId));

//     let feParts = [];
//     if (fePartIds) feParts = await Part.findAll({ where: { id: fePartIds } });

//     return Promise.resolve(feParts);
//   } catch (error) {
//     return Promise.reject(error);
//   }
// };

exports.clearExcludeFlags = async () => {
  try {
    await Part.update({ exclude: false }, { where: {} });
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.setExcludeFlags = async parts => {
  try {
    for (const part of parts) {
      if (part && typeof part.partNumber !== 'undefined') {
        await Part.update(
          { exclude: true },
          { where: { partNumber: part.partNumber } }
        );
      }
    }
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.findAllPartsForProductId = async productId => {
  try {
    const parts = await Part.findAll({
      where: { exclude: false },
      include: [
        {
          model: Product,
          where: { id: productId, exclude: false }
        }
      ]
    });
    return Promise.resolve(parts);
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.getPartData = async partId => {
  try {
    const part = await Part.findOne({
      where: { id: partId },
      include: [
        { model: Stock },
        { model: Part, as: 'fePart', include: [{ model: Stock }] }
      ]
    });
    return Promise.resolve(part);
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.getSerialParts = async serialId => {
  try {
    const parts = await Part.findAll({
      where: { exclude: false },
      attributes: ['id'],
      include: [
        { model: Serial, required: true, where: { id: serialId } } // ,
        // { model: Stock },
        // { model: Part, as: 'fePart', include: [{ model: Stock }] }
      ]
    });
    return Promise.resolve(parts);
  } catch (error) {
    return Promise.reject(error);
  }
};
