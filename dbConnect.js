const Part = require('./models/Part');
const Stock = require('./models/Stock');
const Product = require('./models/Product');
const ProductPart = require('./models/ProductPart');
const System = require('./models/System');
const Serial = require('./models/Serial');
const SerialPart = require('./models/SerialPart');
const Contract = require('./models/Contract');
const PartFieldEquiv = require('./models/PartFieldEquiv');

const dbConnect = async options => {
  const force = options || {}; // { force: true };
  // const force = { force: true };

  try {
    await SerialPart.sync(force);
    await ProductPart.sync(force);
    await PartFieldEquiv.sync(force);
    await Contract.sync(force);
    await Stock.sync(force);
    await Part.sync(force);
    await Product.sync(force);
    await System.sync(force);
    await Serial.sync(force);
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = dbConnect;
