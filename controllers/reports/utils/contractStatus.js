const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const configFilesController = require('../../configFilesController');

dayjs.extend(customParseFormat);

const expireDate = configFilesController.getContractExpireDate();

const contractsStatus = contract => {
  const endDate = dayjs(contract.endDate, 'MMDDYY');

  if (endDate.isBefore(dayjs(expireDate))) {
    return 'expired';
  }

  if (endDate.isBefore(dayjs(expireDate).add(6, 'month'))) {
    return 'active6m';
  }

  return 'active';
};

module.exports = contractsStatus;
