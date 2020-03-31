const sequelize = require('sequelize');
const db = require('../db');

const Product = db.define(
  'product',
  {
    productNumber: { type: sequelize.STRING, allowNull: false, unique: true },
    description: { type: sequelize.TEXT },
    scanStatus: { type: sequelize.STRING },
    exclude: { type: sequelize.BOOLEAN, defualtValue: false }
  },
  {
    // options
  }
);

module.exports = Product;
