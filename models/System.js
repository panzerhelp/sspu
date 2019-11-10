const sequelize = require('sequelize');
const db = require('../db');
const Product = require('../models/Product');
const Contract = require('../models/Contract');

const System = db.define(
  'system',
  {
    serial: { type: sequelize.STRING, allowNull: false, unique: true },
    partSystemId: { type: sequelize.INTEGER },
    scanStatus: { type: sequelize.STRING }
  },
  {
    // options
  }
);

Product.hasOne(System);
Contract.hasOne(System);

module.exports = System;

// id integer NOT NULL PRIMARY KEY autoincrement,
// serial said integer NOT NULL UNIQUE,
// wasSearched integer,
// productId integer NOT NULL,
// contractId integer,
// systemIdParts integer,
// orderId integer,
// FOREIGN KEY(productId) REFERENCES products(id),
// FOREIGN KEY(contractId) REFERENCES contracts(id)
// FOREIGN KEY(orderId) REFERENCES salesOrders(id)
