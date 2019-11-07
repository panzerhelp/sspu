// const path = require('path');
const configFileController = require('../../controllers/configFilesController');

class FileImport {
  constructor() {
    this.fileImport = document.querySelector('#file-import-block') || [];
    this.files = configFileController.selectAllFilesFromConfig();
    this.sections = {
      stockFile: {
        title: 'stock file'
      },
      salesDataFile: {
        title: 'sales data file'
      },
      priceFile: {
        title: 'part price file'
      }
    };
    this.injectHTML();
  }

  // events
  events() {
    console.log('File Import Events');
  }

  // methods
  addButtonHTML(file, fileType, secondary) {
    const btnClass =
      fileType === 'priceFile' || typeof secondary !== 'undefined'
        ? 'btn-outline-warning'
        : 'btn-outline-danger';
    return file
      ? `<button type="button" class="btn btn-outline-dark btn-sm" id="'${fileType}'Clear" onclick="clearFile('${fileType}')"><i class="fas fa-minus-circle"></i> remove</button>`
      : `<button class="btn ${btnClass} btn-sm" id="${fileType}Button" onclick="selectFile('${fileType}')"><i class="fas fa-plus-circle"></i> add </button>`;
  }

  addItemHTML(file, fileType) {
    let fileSize;

    if (file) {
      fileSize = (file.size / 1024).toFixed(2);
    }

    return file
      ? ` <a class="p-2" href="#" onclick="openFile('${file.id}')" id="${fileType}Path">${file.name}</a>
        <div id="${fileType}Info"> ${fileSize}K <i class="fas fa-table"></i></div>`
      : ` <a class="p-2" href="#" onclick="selectFile('${fileType}')" id="${fileType}Path">add ${this.sections[fileType].title}</a>
    <div id="${fileType}Info">- <i class="fas fa-table"></i></div>`;
  }

  addFileSection(file, fileType, secondary) {
    const buttonHtml = this.addButtonHTML(file, fileType, secondary);
    const itemHtml = this.addItemHTML(file, fileType);
    return `
    <li class="list-group-item m-0">
      <div class="row align-items-center">
        <div class="col-md-3">
          ${buttonHtml}
        </div>
        <div class="col-md-9">
          <div class="d-flex align-items-center justify-content-between">
           ${itemHtml}
          </div>
        </div>
      </div>
    </li>
    `;
  }

  dataFileBlockHTML(fileArr, fileType) {
    let fileSectionHtml = '';
    if (fileArr.length < 1) {
      fileSectionHtml = this.addFileSection(null, fileType);
    } else {
      fileArr.forEach(file => {
        fileSectionHtml += this.addFileSection(file, fileType);
      });
      if (fileType === 'salesDataFile') {
        fileSectionHtml += this.addFileSection(null, fileType, 'secondary');
      }
    }

    return `
      <ul class="list-group mb-5" id="${fileType}Section"> <h5> ${this.sections[fileType].title}</h5>
          ${fileSectionHtml}
      </ul>
    `;
  }

  importButtonHTML() {
    return `<div class="d-flex justify-content-center p-2">
        <button class="btn btn-primary px-5 py-2" onclick="importFiles()"><i class="fas fa-file-import"></i>   Import </button>
        </div>`;
  }

  checkIfEnoughFiles() {
    let stockDataFileCount = 0;
    let salesDataFileCount = 0;

    if (this.files) {
      this.files.forEach(file => {
        if (file.type === 'stockFile') {
          stockDataFileCount++;
        } else if (file.type === 'salesDataFile') {
          salesDataFileCount++;
        }
      });
    }

    if (stockDataFileCount > 0 && salesDataFileCount > 0) {
      return true;
    }

    return false;
  }

  injectHTML() {
    this.fileImport.innerHTML = '';
    if (this.files) {
      Object.keys(this.sections).forEach(section => {
        const fileArr = [];
        this.files.forEach(file => {
          if (file.type === section) {
            fileArr.push(file);
          }
        });
        this.fileImport.innerHTML += this.dataFileBlockHTML(fileArr, section);
      });

      if (this.checkIfEnoughFiles()) {
        this.fileImport.innerHTML += this.importButtonHTML();
      }
    }
  }
}

module.exports = FileImport;
