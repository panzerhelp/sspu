const Part = require('./models/Part');
const Product = require('./models/Product');
const ProductPart = require('./models/ProductPart');
const Stock = require('./models/Stock');

const dbConnect = async () => {
  const force = { force: true };

  await Part.sync(force);
  await Product.sync(force);
  await ProductPart.sync(force);
  await Stock.sync(force);
};

module.exports = dbConnect;
