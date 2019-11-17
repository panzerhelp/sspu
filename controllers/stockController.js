/* eslint-disable no-restricted-syntax */
const Stock = require('../models/Stock');
const Part = require('../models/Part');
const db = require('../db');
const partController = require('../controllers/partController');

exports.clearStock = () => {
  return new Promise((resolve, reject) => {
    Stock.destroy({
      where: {},
      truncate: true
    })
      .then(() => {
        db.query("UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='stock'")
          .then(resolve())
          .catch(err => reject(err));
      })
      .catch(err => reject(err));
  });
};

exports.addStockParts = async stockParts => {
  try {
    for (const part of stockParts) {
      if (part && typeof part.partNumber !== 'undefined' && part.partNumber) {
        await partController.addOnePartFromStock(part);
      }
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
