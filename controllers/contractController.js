/* eslint-disable no-restricted-syntax */
const { ipcRenderer } = require('electron');
const sequelize = require('sequelize');

const Contract = require('../models/Contract');
const db = require('../db');

exports.addOneContract = contract => {
  return new Promise((resolve, reject) => {
    Contract.findCreateFind({
      where: { said: contract.said },
      defaults: {
        startDate: contract.startDate,
        endDate: contract.endDate,
        response: contract.response,
        customer: contract.customer,
        country: contract.country,
        city: contract.city
      }
    })
      // eslint-disable-next-line no-unused-vars
      .then(([contractdb, created]) => {
        resolve(contractdb);
      })
      .catch(err => {
        reject(err);
      });
  });
};

exports.addContracts = async contractsData => {
  try {
    const contractIds = {};
    const tot = Object.keys(contractsData).length;
    let cur = 1;
    for (const said in contractsData) {
      if ({}.hasOwnProperty.call(contractsData, said)) {
        const contract = contractsData[said];

        ipcRenderer.send('set-progress', {
          mainItem: 'Importing contracts',
          subItem: `${said}`,
          curItem: cur,
          totalItem: tot
        });

        cur++;

        const { id } = await this.addOneContract({
          said: said,
          startDate: contract.startDate,
          endDate: contract.endDate,
          response: contract.response,
          customer: contract.customer,
          country: contract.country,
          city: contract.city
        });
        contractIds[said] = id;
      }
    }

    return Promise.resolve(contractIds);
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.clearContracts = () => {
  return new Promise((resolve, reject) => {
    Contract.destroy({
      where: {},
      truncate: true
    })
      .then(() => {
        db.query("UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='contracts'")
          .then(resolve())
          .catch(err => reject(err));
      })
      .catch(err => reject(err));
  });
};

exports.getAllContracts = async () => {
  try {
    const contracts = await Contract.findAll({
      attributes: [
        'customer',
        [sequelize.fn('COUNT', sequelize.col('customer')), 'contractNum']
      ],
      group: ['customer'],
      order: [[sequelize.fn('COUNT', sequelize.col('customer')), 'DESC']]
    });

    return Promise.resolve(contracts);
  } catch (error) {
    return Promise.reject(error);
  }
};
