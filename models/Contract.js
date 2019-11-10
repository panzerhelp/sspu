const sequelize = require('sequelize');
const db = require('../db');

const Contract = db.define('contract', {
  said: { type: sequelize.STRING, allowNull: false, unique: true },
  startDate: { type: sequelize.STRING, allowNull: false },
  endDate: { type: sequelize.STRING, allowNull: false },
  response: { type: sequelize.STRING, allowNull: false },
  customer: { type: sequelize.STRING },
  country: { type: sequelize.STRING },
  city: { type: sequelize.STRING }
});

module.exports = Contract;

// id integer NOT NULL PRIMARY KEY autoincrement,
// said integer NOT NULL UNIQUE,
// startDate text NOT NULL,
// endDate text NOT NULL,
// responce text NOT NULL,
// customerId integer,
// FOREIGN KEY(customerId) REFERENCES customers(id)
