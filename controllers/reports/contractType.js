const contractType = contract => {
  if (contract.response.toLowerCase().indexOf('ctr') !== -1) {
    return 'ctr';
  }

  if (
    contract.response.toLowerCase().indexOf('4h') !== -1 ||
    contract.response.toLowerCase().indexOf('sd') !== -1
  ) {
    return 'sd';
  }

  return 'nd';
};

module.exports = contractType;
