const stockPartUsageReport = require('./reports/stockPartUsageReport');

exports.generateReports = async () => {
  try {
    const stockUsageFile = await stockPartUsageReport();
    // const contractUsageFile = await generateContractPartUsageReport();

    return Promise.resolve(stockUsageFile);
  } catch (error) {
    return Promise.reject(error);
  }
};
