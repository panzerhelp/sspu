const db = require('../db');
const Part = require('./Part');
const System = require('./System');

const SystemPart = db.define('systemPart', {}, {});
System.belongsToMany(Part, { through: SystemPart });
Part.belongsToMany(System, { through: SystemPart });

module.exports = SystemPart;
