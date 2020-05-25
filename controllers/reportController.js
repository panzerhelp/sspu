const stockPartUsageReport = require('./reports/stockPartUsageReport');
const contractPartUsageReport = require('./reports/contractPartUsageReport');
const productPartUsageReport = require('./reports/productPartUsageReport');
const PartCache = require('./reports/utils/PartCache');
const ProdCache = require('./reports/utils/ProdCache');

exports.generateReports = async () => {
  try {
    PartCache.clear();
    ProdCache.clear();
    const stockUsageFile = await stockPartUsageReport();
    const productUsageFile = await productPartUsageReport();
    const contractUsageFile = await contractPartUsageReport();

    PartCache.clear();
    ProdCache.clear();
    return Promise.resolve([
      stockUsageFile,
      productUsageFile,
      contractUsageFile
    ]);
  } catch (error) {
    return Promise.reject(error);
  }
};
