class Progress {
  constructor(title) {
    this.title = title;
    this.mainItem = document.getElementById('mainItem');
    this.percentage = document.getElementById('percentage');
    this.subItem = document.getElementById('subItem');
    this.subItemStatus = document.getElementById('subItemStatus');
    this.progressBar = document.getElementById('progressBar');
    this.progress = document.getElementsByClassName('progress');
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
      percentage: status.totalItem ? `${pct} %` : '',
      subItemStatus: status.totalItem
        ? `${status.curItem} / ${status.totalItem}`
        : ''
    };

    if (status.totalItem) {
      this.progressBar.style.display = 'block';
      this.progress[0].style.display = 'flex';
      this.progressBar.style.width = `${pct}%`;
      this.progressBar['aria-valuenow'] = pct;
      // this.progressBar.textContent = `${pct} %`;
    } else {
      this.progressBar.style.display = 'none';
      this.progress[0].style.display = 'none';
    }

    this.setStatus(progressStatus);
  }
}

module.exports = Progress;
