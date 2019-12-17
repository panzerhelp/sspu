const stockPartUsageReport = require('./reports/stockPartUsageReport');
const contractPartUsageReport = require('./reports/contractPartUsageReport');

exports.generateReports = async () => {
  try {
    const stockUsageFile = await stockPartUsageReport();
    // const contractUsageFile = await contractPartUsageReport();

    // return Promise.resolve([/* stockUsageFile, */ contractUsageFile]);
    return Promise.resolve(stockUsageFile);
    // return Promise.resolve(contractUsageFile);
  } catch (error) {
    return Promise.reject(error);
  }
};
