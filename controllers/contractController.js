const Contract = require('../models/Contract');

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
      .then(([contractdb, created]) => {
        resolve(contractdb.dataValues);
      })
      .catch(err => {
        reject(err);
      });
  });
};

exports.addContracts = contractsData => {
  return new Promise((resolve, reject) => {
    const promiseArray = [];

    Object.keys(contractsData).forEach(said => {
      promiseArray.push(
        this.addOneContract({
          said: said,
          startDate: contractsData[said].startDate,
          endDate: contractsData[said].endDate,
          response: contractsData[said].response,
          customer: contractsData[said].customer,
          country: contractsData[said].country,
          city: contractsData[said].city
        })
      );
    });

    Promise.all(promiseArray).then(
      contracts => {
        const contractIds = Object.assign(
          {},
          ...contracts.map(contract => ({ [contract.said]: contract.id }))
        );
        resolve(contractIds);
      },
      reason => {
        reject(reason);
      }
    );
  });
};
