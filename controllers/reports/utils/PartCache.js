const partController = require('../../partController');

const PartCache = {
  parts: {},
  async getPart(partId) {
    try {
      if (typeof this.parts[partId] === 'undefined') {
        this.parts[partId] = await partController.getPartData(partId);
      }
      return Promise.resolve(this.parts[partId]);
    } catch (error) {
      return Promise.reject(error);
    }
  },

  clear() {
    this.parts = {};
  }
};

module.exports = PartCache;
