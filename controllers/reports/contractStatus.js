const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);

const contractsStatus = contract => {
  const endDate = dayjs(contract.endDate, 'MMDDYY');

  if (endDate.isBefore(dayjs())) {
    return 'expired';
  }

  if (endDate.isBefore(dayjs().add(6, 'month'))) {
    return 'active6m';
  }

  return 'active';
};

module.exports = contractsStatus;
