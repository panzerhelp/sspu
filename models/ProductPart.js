const db = require('../db');
const Part = require('./Part');
const Product = require('./Product');

const ProductPart = db.define('productPart', {}, {});
Product.belongsToMany(Part, { through: ProductPart });
Part.belongsToMany(Product, { through: ProductPart });

module.exports = ProductPart;
