/* eslint-disable no-restricted-syntax */
const { ipcRenderer } = require('electron');
const Stock = require('../models/Stock');
const Part = require('../models/Part');
const db = require('../db');
const partController = require('../controllers/partController');

exports.clearStock = async () => {
  try {
    await Stock.destroy({ where: {}, truncate: true });
    await db.query("UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='stock'");
    await Part.update({ stockQty: 0 }, { where: {} });

    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};
//   return new Promise((resolve, reject) => {
//     Stock.destroy({
//       where: {},
//       truncate: true
//     })
//       .then(() => {
//         db.query("UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='stock'")
//           .then(resolve())
//           .catch(err => reject(err));
//       })
//       .catch(err => reject(err));
//   });
// };

exports.addStockParts = async stockParts => {
  try {
    const tot = stockParts.length;
    let cur = 1;
    for (const part of stockParts) {
      if (part && typeof part.partNumber !== 'undefined' && part.partNumber) {
        ipcRenderer.send('set-progress', {
          mainItem: 'Importing parts from stock',
          subItem: `${part.partNumber}`,
          curItem: cur,
          totalItem: tot
        });
        await partController.addOnePartFromStock(part);
      }
      cur++;
    }
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.clearStockCaseUse = async () => {
  return new Promise((resolve, reject) => {
    Stock.update({ caseUse: 0 }, { where: {} })
      .then(() => resolve())
      .catch(err => reject(err));
  });
};

exports.addStockPartCaseUsage = async partUsageData => {
  try {
    for (const partUsage of partUsageData) {
      if (partUsage) {
        const part = await Part.findOne({
          where: { partNumber: partUsage.partNumber },
          include: [{ model: Stock }]
        });

        if (part) {
          for (const stock of part.stocks) {
            const newQty = (stock.caseUse ? stock.caseUse : 0) + partUsage.qty;
            await stock.update({ caseUse: newQty });
          }
        }
      }
    }
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};
