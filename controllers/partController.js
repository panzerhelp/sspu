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

// exports.addStockParts = async partArray => {
//   return new Promise((resolve, reject) => {
//     // clear stock
//     Stock.sync({ force: true })
//       .then(() => {
//         const promiseArray = [];
//         partArray.forEach(part => {
//           promiseArray.push(this.addOnePartFromStock(part));
//         });

//         Promise.all(promiseArray).then(
//           value => {
//             debugger;
//             resolve(value);
//           },
//           reason => {
//             reject(reason);
//           }
//         );
//       })
//       .catch(err => reject(err));
//   });

// await Stock.sync({ force: true });
// const promiseArray = [];

// partArray.forEach(part => {
//   const promise = new Promise((resolve, reject) => {
//     Part.findCreateFind({
//       where: { partNumber: part.partNumber },
//       defaults: {
//         description: part.description,
//         price: part.price
//       }
//     })
//       // eslint-disable-next-line no-unused-vars
//       .then(([partdb, created]) => {
//         if (!created) {
//           // update price
//           partdb.update({
//             price: part.price
//           });
//         }
//         Stock.create({
//           qty: part.qty,
//           partId: partdb.id
//         })
//           .then(resolve())
//           .catch(err => reject(err));
//       })
//       .catch(err => {
//         console.log(err);
//         reject(err);
//       });
//   });
//   promiseArray.push(promise);
// });

// Promise.all(promiseArray).then(
//   value => {
//     console.log(value);
//   },
//   reason => {
//     console.log(reason);
//   }
// );
// };
