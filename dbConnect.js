const Part = require('./models/Part');
const Stock = require('./models/Stock');
const Product = require('./models/Product');
const ProductPart = require('./models/ProductPart');
const System = require('./models/System');
const SystemPart = require('./models/SystemPart');
const Contract = require('./models/Contract');

const dbConnect = async () => {
  // const force = {}; // { force: true };
  const force = { force: true };

  await Part.sync(force);
  await Product.sync(force);
  await ProductPart.sync(force);
  await Stock.sync(force);
  await System.sync(force);
  await SystemPart.sync(force);
  await Contract.sync(force);
};

module.exports = dbConnect;
