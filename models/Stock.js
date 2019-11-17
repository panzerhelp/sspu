const sequelize = require('sequelize');
const db = require('../db');
const Part = require('./Part');

const Stock = db.define(
  'stock',
  {
    qty: { type: sequelize.INTEGER, defaulValue: 0 },
    caseUse: { type: sequelize.INTEGER, defaulValue: 0 }
  },
  {
    freezeTableName: true
  }
);

Part.hasMany(Stock);
Stock.belongsTo(Part);

module.exports = Stock;
