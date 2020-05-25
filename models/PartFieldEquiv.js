// const sequelize = require('sequelize');
const db = require('../db');
const Part = require('../models/Part');

const PartFieldEquiv = db.define(
  'partFieldEquiv',
  {
    // fePartId: {
    //   type: sequelize.INTEGER,
    //   references: {
    //     model: 'parts',
    //     key: 'id'
    //   }
    // }
  },
  {}
);

Part.belongsToMany(Part, { as: 'fePart', through: 'partFieldEquiv' });

module.exports = PartFieldEquiv;
