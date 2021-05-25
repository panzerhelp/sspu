const sequelize = require('sequelize');
const db = require('../db');
const Part = require('../models/Part');

const PartFieldEquiv = db.define(
  'partFieldEquiv',
  {
    addedByCode: { type: sequelize.BOOLEAN, defualtValue: false }
  },
  {}
);

Part.belongsToMany(Part, { as: 'fePart', through: 'partFieldEquiv' });

module.exports = PartFieldEquiv;
