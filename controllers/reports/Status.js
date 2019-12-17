class Status {
  constructor() {
    this.active = {
      ctr: 0,
      sd: 0,
      nd: 0
    };

    this.active6m = {
      ctr: 0,
      sd: 0,
      nd: 0
    };

    this.expired = {
      ctr: 0,
      sd: 0,
      nd: 0
    };
  }
}

module.exports = Status;
