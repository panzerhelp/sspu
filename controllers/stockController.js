/* eslint-disable no-restricted-syntax */
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

const { ipcRenderer } = require('electron');
const Stock = require('../models/Stock');
const Part = require('../models/Part');
const Case = require('../models/Case');
const CasePart = require('../models/CasePart');
const db = require('../db');
const partController = require('../controllers/partController');

dayjs.extend(customParseFormat);

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

exports.addPartToStock = async (stockPart, partId) => {
  try {
    const [stockPart_, wasCreated_] = await Stock.findCreateFind({
      where: { partId: partId, location: stockPart.location },
      defaults: {
        qty: stockPart.qty || 0,
        postDate: stockPart.postDate || '110118'
      }
    });

    if (!wasCreated_) {
      // check is part already exists in this location
      if (stockPart_.location === stockPart.location) {
        stockPart_.qty += stockPart.qty;

        // check if entry has earlier post date
        if (
          dayjs(stockPart_.postDate, 'MMDDYY').isAfter(
            dayjs(stockPart.postDate, 'MMDDYY')
          )
        ) {
          stockPart_.postDate = stockPart.postDate;
        }

        stockPart_.save();
      }
    }
    return Promise.resolve(stockPart);
  } catch (error) {
    return Promise.reject(error);
  }
};

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
        const partDb = await partController.addOnePartFromStock(part);
        await this.addPartToStock(part, partDb.id);
      }
      cur++;
    }
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.getAllStockParts = async () => {
  try {
    const stockParts = await Part.findAll({
      where: {},
      include: [
        { model: Stock, required: true },
        { model: CasePart, include: [{ model: Case }] },
        'fePart'
      ],
      order: ['partNumber']
    });
    return Promise.resolve(stockParts);
  } catch (error) {
    return Promise.reject(error);
  }
};
