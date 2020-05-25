const ProdCache = {
  products: {},
  addProduct(prodId, partList) {
    this.products[prodId] = partList;
  },
  getProduct(prodId) {
    return this.products[prodId];
  },
  clear() {
    this.products = {};
  }
};

module.exports = ProdCache;
