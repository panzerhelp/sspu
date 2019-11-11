const Part = require('../models/Part');
const Stock = require('../models/Stock');

exports.addOnePartFromStock = part => {
  return new Promise((resolve, reject) => {
    Part.findCreateFind({
      where: { partNumber: part.partNumber },
      defaults: {
        description: part.description,
        price: part.price
      }
    })
      .then(([partdb, created]) => {
        if (!created) {
          partdb.update({
            // update price for existing part
            price: part.price
          });
        }

        Stock.create({
          qty: part.qty,
          partId: partdb.id
        })
          .then(() => {
            resolve(part);
          })
          .catch(err => reject(err));
      })
      .catch(err => {
        reject(err);
      });
  });
};

exports.addOnePart = part => {
  return new Promise((resolve, reject) => {
    Part.findCreateFind({
      where: { partNumber: part.partNumber },
      defaults: {
        description: part.description,
        descriptionShort: part.descriptionShort,
        csr: part.csr,
        category: part.category,
        mostUsed: part.mostUsed
      }
    })
      .then(([partdb, created]) => {
        resolve(partdb.dataValues);
      })
      .catch(err => reject(err));
  });
};

exports.addPartsFromPartSurfer = partObject => {
  return new Promise((resolve, reject) => {
    const promiseArray = [];
    Object.keys(partObject).forEach(key => {
      promiseArray.push(this.addOnePart(partObject[key]));
    });
    // partArray.forEach(part => promiseArray.push(this.addOnePartGenTab(part)));
    Promise.all(promiseArray).then(
      parts => {
        resolve(parts);
      },
      reason => {
        reject(reason);
      }
    );
  });
};
