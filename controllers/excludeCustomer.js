/* eslint-disable no-restricted-syntax */
exports.excludeCustomerList = [];

exports.clearExcludeCustomerList = () => {
  this.excludeCustomerList = [];
};

exports.addExcludeCustomer = customers => {
  for (const customer of customers) {
    if (customer && typeof customer.customer !== 'undefined') {
      this.excludeCustomerList.push(customer.customer.toLowerCase());
    }
  }
};
