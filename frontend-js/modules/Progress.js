class Progress {
  constructor(title) {
    this.title = title;
    this.mainItem = document.getElementById('mainItem');
    this.percentage = document.getElementById('percentage');
    this.subItem = document.getElementById('subItem');
    this.subItemStatus = document.getElementById('subItemStatus');
    this.injectHTML();
    this.events();
  }

  // events
  events() {}

  // methods
  injectHTML() {
    document.title = this.title;
  }

  setStatus(progressStatus) {
    this.mainItem.innerHTML = progressStatus.mainItem || '';
    this.percentage.innerHTML = progressStatus.percentage || '';
    this.subItem.innerHTML = progressStatus.subItem || '';
    this.subItemStatus.innerHTML = progressStatus.subItemStatus || '';
  }

  setProgressStatus(status) {
    const pct = Math.round((status.curItem * 100) / status.totalItem);
    const progressStatus = {
      mainItem: status.mainItem,
      subItem: status.subItem,
      percentage: `${pct} %`,
      subItemStatus: `${status.curItem} / ${status.totalItem}`
    };

    this.setStatus(progressStatus);
  }
}

module.exports = Progress;
