/* eslint-disable no-restricted-syntax */
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

const sequelize = require('sequelize');
const db = require('../db');

dayjs.extend(customParseFormat);

const Part = db.define(
  'part',
  {
    partNumber: { type: sequelize.STRING, allowNull: false, unique: true },
    description: { type: sequelize.TEXT },
    descriptionShort: { type: sequelize.TEXT },
    category: { type: sequelize.STRING },
    mostUsed: { type: sequelize.INTEGER },
    csr: { type: sequelize.STRING },
    price: { type: sequelize.STRING },
    exchangePrice: { type: sequelize.STRING },
    feScanStatus: { type: sequelize.STRING },
    stockQty: { type: sequelize.INTEGER },
    exclude: { type: sequelize.BOOLEAN, defualtValue: false },
    obsolete: { type: sequelize.BOOLEAN, defualtValue: false }
  },
  {
    // options
  }
);

Part.prototype.stockCityQty = function(stockCity) {
  let qty = 0;
  if (this.stocks) {
    for (const stock of this.stocks) {
      if (stock.location === stockCity) {
        qty += stock.qty;
      }
    }
  }

  return qty;
};

Part.prototype.getWeeksOnHand = function(stock) {
  const woh = [];

  if (!stock.postDate) {
    return ['', ''];
  }

  // let lastCaseDate = dayjs('110118', 'MMDDYY'); // default startDate 01-Nov-2018
  let lastCaseDate = dayjs(stock.postDate, 'MMDDYY');

  // if (this.stocks) {
  //   for (const stock of this.stocks) {
  //     if (stock.location === stockCity && stock.postDate) {
  //       lastCaseDate = dayjs(stock.postDate, 'MMDDYY');
  //     }
  //   }
  // }

  if (this.caseParts && this.caseParts.length) {
    const deliveryDates = this.caseParts
      .filter(
        casePart =>
          casePart.status === 'LOCAL' &&
          !casePart.feUsed &&
          casePart.deliveryDate !== '-'
      )
      .map(casePart => ({
        part: this.partNumber,
        date: casePart.deliveryDate,
        case: casePart.case.caseId
      }))
      .sort((a, b) => a.date - b.date);

    deliveryDates.forEach(delivery => {
      const date = dayjs(delivery.date, 'YYYYMMDD');
      if (date.isAfter(lastCaseDate)) {
        woh.push(date.diff(lastCaseDate, 'week'));
        lastCaseDate = date;
      }
    });
  }

  woh.push(dayjs().diff(lastCaseDate, 'week'));

  const wohAvg = Math.floor(woh.reduce((p, c) => p + c, 0) / woh.length);
  const wohLast = woh[woh.length - 1];
  return [wohAvg, wohLast];
};

module.exports = Part;
// name text NOT NULL UNIQUE,
// desc text,
// descA text,
// descE text,
// category text,
// mostUsed integer,
// csr text,
// advFlag text,
// feFlag text,
// listPrice REAL,
// exchangePrice REAL
