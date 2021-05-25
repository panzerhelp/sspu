/* eslint-disable no-new */
// const path = require('path');
const configFileController = require('../../controllers/configFilesController');
const ReportFiles = require('./ReportFiles');

class FileImport {
  constructor() {
    this.fileImport = document.querySelector('#file-import-block') || [];
    this.files = configFileController.selectAllFilesFromConfig();
    this.dataDir = configFileController.getDataDir();

    this.sections = {
      stockFile: {
        title: 'stock file'
      },
      salesDataFile: {
        title: 'sales data file(s)'
      },
      partExcludeFile: {
        title: 'exclude parts / products file'
      },
      stockMapFile: {
        title: 'stock map file'
      },
      caseUsageFile: {
        title: 'part case usage file'
      }
      // ,
      // priceFile: {
      //   title: 'part price file'
      // }
    };
    this.injectHTML();
    this.countryOptions = document.getElementsByClassName('country-option');
    this.countryDropDown = document.querySelector('.countrySelect');
    this.flag = document.getElementById('flag');
    this.skipRejected = document.getElementById('skipFullyRejected');

    if (this.skipRejected) {
      this.skipRejected.checked = configFileController.getSkipFullyRejectedContracts();
    }

    this.events();
  }

  // events
  events() {
    Array.from(this.countryOptions).forEach(country => {
      country.addEventListener('click', e => {
        this.flag.src = `./images/${e.target.innerHTML}.png`;
        configFileController.setImportCountry(e.target.innerHTML);
        this.countryDropDown.innerHTML = e.target.innerHTML;
        new ReportFiles();
      });
    });

    this.skipRejected.addEventListener('click', e => {
      configFileController.toggleSkipFullyRejectedContracts();
      e.target.value = configFileController.getSkipFullyRejectedContracts();
    });
  }

  // methods
  addCountrySelect(fileType) {
    const importCountry = configFileController.getImportCountry();

    return fileType === 'stockFile'
      ? `
    <div class="dropdown" id="countrySelect">
    <button class="btn btn-outline-dark btn-sm dropdown-toggle countrySelect" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
    ${importCountry}
    </button>
    <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
        <a class="dropdown-item country-option" href="#">Lithuania</a>
        <a class="dropdown-item country-option" href="#">Belarus</a>
        <a class="dropdown-item country-option" href="#">Ukraine</a>
    </div> <img id="flag" src="./images/${importCountry}.png">
    </div>
    `
      : '';
  }

  addButtonHTML(file, fileType, secondary) {
    const btnClass =
      fileType === 'caseUsageFile' ||
      fileType === 'stockMapFile' ||
      fileType === 'priceFile' ||
      fileType === 'partExcludeFile' ||
      typeof secondary !== 'undefined'
        ? 'btn-outline-warning'
        : 'btn-outline-danger';
    return file
      ? `<button type="button" class="btn btn-outline-dark btn-sm" id="'${fileType}'Clear" onclick="clearFile('${fileType}')"><i class="fas fa-times-circle"></i></i></button>`
      : `<button class="btn ${btnClass} btn-sm" id="${fileType}Button" onclick="selectFile('${fileType}')"><i class="fas fa-plus-circle"></i></button>`;
  }

  addItemHTML(file, fileType) {
    let fileSize;

    if (file) {
      fileSize = (file.size / 1024).toFixed(2);
    }

    let name;

    if (file) {
      name = file.name;
      if (name.length > 40) {
        name = `${name.substr(0, 20)} ... ${name.substr(name.length - 20)}`;
      }
    }

    return file
      ? ` <a class="p-2" href="#" onclick="openFile('${file.id}')" id="${fileType}Path" name="${file.name}">${name}</a>
        <div id="${fileType}Info"> ${fileSize}K <i class="fas fa-table"></i></div>`
      : ` <a class="p-2" href="#" onclick="selectFile('${fileType}')" id="${fileType}Path">add ${this.sections[fileType].title}</a>
    <div id="${fileType}Info"></div>`;
  }

  addFileSection(file, fileType, secondary) {
    const buttonHtml = this.addButtonHTML(file, fileType, secondary);
    const itemHtml = this.addItemHTML(file, fileType);
    return `
    <li class="list-group-item m-0">
      <div class="row align-items-center">
        <div class="col-sm-1">
          ${buttonHtml}
        </div>
        <div class="col-sm-11">
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

    const countrySelect = this.addCountrySelect(fileType);

    return `
      <div class="row d-flex align-items-center">
        <h5> ${this.sections[fileType].title} </h5> ${countrySelect}
      </div>
      <ul class="list-group mb-2" id="${fileType}Section"> 
          ${fileSectionHtml}
      </ul>
    `;
  }

  importButtonHTML() {
    return `<div class="d-flex justify-content-center p-2 mb-2">
        <button class="btn btn-primary px-5 py-2" onclick="importFiles()"><i class="fas fa-file-import"></i>   Import Files</button>
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

    if (stockDataFileCount && salesDataFileCount) {
      return true;
    }

    return false;
  }

  addDirButtonHTML() {
    const btnColor = this.dataDir ? 'btn-outline-dark' : 'btn-outline-danger';
    return `
      <button class="btn ${btnColor} btn-sm"  onclick="selectDataDir()"><i class="fas fa-folder"></i></i></button>
    `;
  }

  dataDirHTML() {
    const dataDirText = this.dataDir ? this.dataDir : 'add data folder';
    const buttonHtml = this.addDirButtonHTML();
    return `
      <div class="row d-flex align-items-center">
        <h5>output folder</h5>
      </div>
      <ul class="list-group mb-2">
      <li class="list-group-item m-0">
        <div class="row align-items-center">
          <div class="col-sm-1">
           ${buttonHtml}
          </div>
          <div class="col-sm-11">
            <a href="#" onclick="selectDataDir()">${dataDirText}</a>
           </div>
        </div>
      </li>
      </ul>
    `;
  }

  optionsHTML() {
    return `
    <div class="row d-flex align-items-center">
        <h5>import options</h5>
      </div>
    <div class="row import-options">
      <div class="col-8"><span>skip 'fully rejected' contracts</span></div>
      <div class="col-2"><input id="skipFullyRejected" type="checkbox" aria-label="skip fully rejected" "/></div>
    </div>
    `;
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

      if (this.dataDir && this.checkIfEnoughFiles()) {
        this.fileImport.innerHTML += this.importButtonHTML();
        this.fileImport.innerHTML += this.optionsHTML();
      }

      this.fileImport.innerHTML += this.dataDirHTML();
    }
  }
}

module.exports = FileImport;
