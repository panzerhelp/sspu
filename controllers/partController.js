/* eslint-disable no-await-in-loop */
const Part = require('../models/Part');
const Stock = require('../models/Stock');

exports.addStockParts = async partArray => {
  await Stock.sync({ force: true }); // clear stock

  // eslint-disable-next-line no-restricted-syntax
  for (const part of partArray) {
    // eslint-disable-next-line no-unused-vars
    const [partdb, created] = await Part.findOrCreate({
      where: { partNumber: part.partNumber },
      defaults: {
        description: part.description
      }
    });

    debugger;

    await Stock.create({
      qty: part.qty,
      partId: partdb.id
    });
  }

  // let findDuplicates = partArray => arr.filter((item, index) => arr.indexOf(item) != index)

  // const unique = partArray
  //   .map(e => e['partNumber'])
  //   .map((e, i, final) => final.indexOf(e) === i && i)
  //   .filter(obj => partArray[obj])
  //   .map(e => partArray[e]);

  // //debugger;
  // Part.bulkCreate(unique)
  //   .then(()=>{

  //   })
  //   .catch(err => console.log(err));
};
