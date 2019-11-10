const System = require('../models/System');

exports.addOneSystem = system => {
  return new Promise((resolve, reject) => {
    System.findCreateFind({
      where: { serial: system.serial },
      defaults: {
        contractId: system.contractId,
        productId: system.productId
      }
    })
      .then(([systemdb, created]) => {
        console.log(`Added system with serial ${systemdb.serial}`);
        resolve(systemdb.dataValues);
      })
      .catch(err => {
        reject(err);
      });
  });
};

exports.addSystems = (systemsData, productIds, contractIds) => {
  return new Promise((resolve, reject) => {
    const promiseArray = [];

    Object.keys(systemsData).forEach(serial => {
      promiseArray.push(
        this.addOneSystem({
          serial: serial,
          contractId: contractIds[systemsData[serial].contract],
          productId: productIds[systemsData[serial].product]
        })
      );
    });

    Promise.all(promiseArray).then(
      systems => {
        const systemIds = Object.assign(
          {},
          ...systems.map(system => ({ [system.serial]: system.id }))
        );
        resolve(systemIds);
      },
      reason => {
        reject(reason);
        debugger;
      }
    );
  });
};
