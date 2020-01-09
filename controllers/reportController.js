const stockPartUsageReport = require('./reports/stockPartUsageReport');
const contractPartUsageReport = require('./reports/contractPartUsageReport');
const productPartUsageReport = require('./reports/productPartUsageReport');

exports.generateReports = async () => {
  try {
    const stockUsageFile = await stockPartUsageReport();
    const contractUsageFile = await contractPartUsageReport();
    const productUsageFile = await productPartUsageReport();
    return Promise.resolve([
      stockUsageFile,
      contractUsageFile,
      productUsageFile
    ]);
  } catch (error) {
    return Promise.reject(error);
  }
};
