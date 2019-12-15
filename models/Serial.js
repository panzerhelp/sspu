const sequelize = require('sequelize');
const db = require('../db');

const Serial = db.define(
  'serial',
  {
    serialNum: { type: sequelize.STRING, allowNull: false, unique: true },
    parentSerialId: { type: sequelize.INTEGER }, // - pointer to serial id which is has the same part list (null - not scanned)
    scanStatus: { type: sequelize.STRING },
    productNumber: { type: sequelize.STRING } // used to scan serial
  },
  {
    // options
  }
);

module.exports = Serial;
