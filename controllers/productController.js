const Product = require('../models/Product');

exports.addOneProduct = product => {
  return new Promise((resolve, reject) => {
    Product.findCreateFind({
      where: { productNumber: product.productNumber },
      defaults: {
        description: product.description
      }
    })
      .then(([productdb, created]) => {
        resolve(productdb.dataValues);
      })
      .catch(err => {
        reject(err);
      });
  });
};

exports.addProducts = productsData => {
  return new Promise((resolve, reject) => {
    const promiseArray = [];

    Object.keys(productsData).forEach(productNumber => {
      promiseArray.push(
        this.addOneProduct({
          productNumber: productNumber,
          description: productsData[productNumber].description
        })
      );
    });

    Promise.all(promiseArray).then(
      products => {
        const productIds = Object.assign(
          {},
          ...products.map(product => ({ [product.productNumber]: product.id }))
        );
        resolve(productIds);
      },
      reason => {
        reject(reason);
        debugger;
      }
    );
  });
};
