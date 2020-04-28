const Part = require('./models/Part');
const Stock = require('./models/Stock');
const Product = require('./models/Product');
const ProductPart = require('./models/ProductPart');
const System = require('./models/System');
const Serial = require('./models/Serial');
const SerialPart = require('./models/SerialPart');
const Contract = require('./models/Contract');
const PartFieldEquiv = require('./models/PartFieldEquiv');
const Case = require('./models/Case');
const CasePart = require('./models/CasePart');

const dbConnect = async options => {
  const forceOpt = options || {}; // { force: true };
  // const force = { force: true };

  try {
    await SerialPart.sync(forceOpt);
    await ProductPart.sync(forceOpt);
    await PartFieldEquiv.sync(forceOpt);
    await Contract.sync(forceOpt);
    await Stock.sync(forceOpt);
    await Part.sync(forceOpt);
    await Product.sync(forceOpt);
    await System.sync(forceOpt);
    await Serial.sync(forceOpt);
    await Case.sync(forceOpt);
    await CasePart.sync(forceOpt);
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = dbConnect;
