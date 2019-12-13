const sequelize = require('sequelize');
const db = require('../db');
const Product = require('./Product');
const Contract = require('./Contract');
const Serial = require('./Serial');

const System = db.define(
  'system',
  {
    serialList: { type: sequelize.TEXT }
  },
  {
    // options
  }
);

Product.hasMany(System);
System.belongsTo(Product);

Contract.hasMany(System);
System.belongsTo(Contract);

Serial.hasMany(System);
System.belongsTo(Serial);

module.exports = System;
