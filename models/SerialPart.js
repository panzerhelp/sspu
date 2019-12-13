const db = require('../db');
const Part = require('./Part');
const Serial = require('./Serial');

const SerialPart = db.define('serialPart', {}, {});
Serial.belongsToMany(Part, { through: SerialPart });
Part.belongsToMany(Serial, { through: SerialPart });

// Part.belongsToMany(System, { through: SystemPart });

module.exports = SerialPart;
