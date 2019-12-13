/* eslint-disable no-restricted-syntax */
const sequelize = require('sequelize');
const Serial = require('../models/Serial');

const { Op } = sequelize;

exports.addOneSerial = async serial => {
  try {
    const [serialdb, created] = await Serial.findCreateFind({
      where: {
        serialNum: serial
      },
      defaults: {
        serialNum: serial,
        parentSerialId: 0
      }
    });

    console.log(
      created
        ? `Added serial ${serialdb.serialNum}`
        : `Updated serial ${serialdb.serialNum}`
    );

    return Promise.resolve(serialdb.id);
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.addSerialList = async serialList => {
  try {
    const serialSearch = serialList.map(s => {
      return { [Op.like]: `%${s}%` };
    });

    const [serialdb, created] = await Serial.findCreateFind({
      where: {
        serialNum: { [Op.or]: serialSearch }
      },
      defaults: {
        serialNum: serialList[0],
        parentSerialId: 0
      }
    });

    console.log(
      created
        ? `Added serial ${serialdb.serialNum}`
        : `Updated serial ${serialdb.serialNum}`
    );

    return Promise.resolve(serialdb.id);
  } catch (error) {
    return Promise.reject(error);
  }
};
