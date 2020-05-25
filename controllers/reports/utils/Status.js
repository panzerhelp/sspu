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

  add(otherStatus) {
    this.active.ctr += otherStatus.active.ctr;
    this.active.sd += otherStatus.active.sd;
    this.active.nd += otherStatus.active.nd;

    this.active6m.ctr += otherStatus.active6m.ctr;
    this.active6m.sd += otherStatus.active6m.sd;
    this.active6m.nd += otherStatus.active6m.nd;

    this.expired.ctr += otherStatus.expired.ctr;
    this.expired.sd += otherStatus.expired.sd;
    this.expired.nd += otherStatus.expired.nd;
  }

  isInactive() {
    return (
      this.active.ctr + this.active.sd + this.active6m.ctr + this.active6m.sd <
      1
    );
  }

  isInactive6m() {
    return this.active.ctr + this.active.sd < 1;
  }

  total() {
    return (
      this.active.ctr +
      this.active.sd +
      this.active.nd +
      this.active6m.ctr +
      this.active6m.sd +
      this.active6m.nd +
      this.expired.ctr +
      this.expired.sd +
      this.expired.nd
    );
  }
}

module.exports = Status;
