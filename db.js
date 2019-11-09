const Sequelize = require('sequelize');
const path = require('path');
const configFileController = require('./controllers/configFilesController');

const db = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(configFileController.getDataDir(), 'sspu.sqlite'),

  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = db;
