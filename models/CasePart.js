const sequelize = require('sequelize');
const db = require('../db');
const Part = require('./Part');
const Case = require('./Case');

const CasePart = db.define(
  'casePart',
  {
    date: { type: sequelize.STRING },
    status: { type: sequelize.STRING },
    feUsed: { type: sequelize.STRING },
    gcsn: { type: sequelize.STRING },
    qty: { type: sequelize.STRING, allowNull: false },
    deliveryDate: { type: sequelize.STRING }
  },
  {}
);

Part.hasMany(CasePart);
CasePart.belongsTo(Part);

Case.hasMany(CasePart);
CasePart.belongsTo(Case);

CasePart.prototype.isStockMiss = function() {
  return (
    this.case.response.toLowerCase() !== 'nd' &&
    this.status.toLowerCase() === 'central'
  );
};

CasePart.prototype.getStatus = function() {
  if (this.status.toLowerCase() === 'central rdd') {
    return 'Central Stock (Requested Delivery Date)';
  }

  if (this.status.toLowerCase() === 'local') {
    return this.feUsed ? `Local Stock (FE ${this.feUsed})` : 'Local Stock';
  }

  const missed = this.case.response.toLowerCase() === 'nd' ? '' : ' [MISSED]';
  return this.feUsed
    ? `Central Stock (FE ${this.feUsed})${missed}`
    : `Central Stock${missed}`;
};

Part.prototype.getStockMiss = function() {
  let stockMiss = 0;
  this.caseParts.forEach(casePart => {
    if (casePart.isStockMiss()) {
      stockMiss++;
    }
  });
  return stockMiss;
};

module.exports = CasePart;
