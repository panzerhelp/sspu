const stockPartUsageReport = require('./reports/stockPartUsageReport');
const contractPartUsageReport = require('./reports/contractPartUsageReport');

exports.generateReports = async () => {
  try {
    // const stockUsageFile = await stockPartUsageReport();
    // return Promise.resolve(stockUsageFile);

    const contractUsageFile = await contractPartUsageReport();
    return Promise.resolve(contractUsageFile);
  } catch (error) {
    return Promise.reject(error);
  }
};
