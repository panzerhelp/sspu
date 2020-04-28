const sequelize = require('sequelize');
const db = require('../db');

const Case = db.define(
  'case',
  {
    caseId: { type: sequelize.STRING, allowNull: false, unique: true },
    date: { type: sequelize.STRING, allowNull: false },
    customer: { type: sequelize.STRING, allowNull: false },
    response: { type: sequelize.STRING, allowNull: false },
    serial: { type: sequelize.STRING, allowNull: false },
    product: { type: sequelize.STRING, allowNull: false },
    contract: { type: sequelize.STRING, allowNull: false },
    partner: { type: sequelize.STRING }
  },
  {
    // options
  }
);

Case.prototype.getCaseId = function() {
  return this.caseId.indexOf('DUMMY') !== -1 ? 'not created' : this.caseId;
};

module.exports = Case;
