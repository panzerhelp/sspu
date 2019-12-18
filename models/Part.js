const sequelize = require('sequelize');
const db = require('../db');

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
    stockQty: { type: sequelize.INTEGER }
  },
  {
    // options
  }
);

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
