const Stock = require('../models/Stock');
const db = require('../db');

exports.clearStock = () => {
  return new Promise((resolve, reject) => {
    Stock.destroy({
      where: {},
      truncate: true
    })
      .then(() => {
        db.query("UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='stock'")
          .then(resolve())
          .catch(err => reject(err));
      })
      .catch(err => reject(err));
  });
};
