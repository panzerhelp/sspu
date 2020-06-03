const sequelize = require('sequelize');
const db = require('../db');
const Part = require('./Part');

const Stock = db.define(
  'stock',
  {
    qty: { type: sequelize.INTEGER, defaulValue: 0 },
    location: { type: sequelize.STRING, defaulValue: 'DEFAULT' },
    postDate: { type: sequelize.STRING }
    // caseUse: { type: sequelize.INTEGER, defaulValue: 0 } // not used
  },
  {
    freezeTableName: true
  }
);

Part.hasMany(Stock);
Stock.belongsTo(Part);

module.exports = Stock;
