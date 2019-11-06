// const { remote } = require('electron');

document.title = `SSPU v.${process.env.npm_package_version}`;
const configFileController = require('./controllers/configFilesController');
const dataFileController = require('./controllers/dataFileController');

const updateHtml = (file, fileType) => {
  if (file) {
    document.getElementById(`${file.type}Path`).textContent = file.name;
    document.getElementById(`${file.type}Info`).innerHTML = `${(
      file.size / 1024
    ).toFixed(2)}K  <i class="fas fa-table"></i>`;
    document
      .getElementById(`${file.type}Button`)
      .classList.remove('btn-danger');
    document
      .getElementById(`${file.type}Button`)
      .classList.remove('btn-warning');
    document.getElementById(`${file.type}Button`).classList.add('btn-info');
    document.getElementById(`${file.type}Clear`).style.display = 'inline';
  } else {
    const defaultText = {
      stockFile: 'Select Stock File',
      salesDataFile: 'Select Sales Data File',
      priceFile: 'Select Part Price File'
    };

    document.getElementById(`${fileType}Path`).textContent =
      defaultText[fileType];
    document.getElementById(
      `${fileType}Info`
    ).innerHTML = `- <i class="fas fa-table"></i>`;
    document.getElementById(`${fileType}Button`).classList.remove('btn-info');
    document
      .getElementById(`${fileType}Button`)
      .classList.add(fileType === 'priceFile' ? 'btn-warning' : 'btn-danger');
    document.getElementById(`${fileType}Clear`).style.display = 'none';
  }
};

// eslint-disable-next-line no-unused-vars
const openFile = fileType => {
  const file = configFileController.selectFile(`${fileType}`);
  if (file) updateHtml(file);
};

// eslint-disable-next-line no-unused-vars
const clearFile = fileType => {
  configFileController.clearFileFromConfig(fileType);
  updateHtml(null, fileType);
};

// eslint-disable-next-line no-unused-vars
const importFiles = () => {
  dataFileController.importFiles();
};

const init = () => {
  const files = configFileController.selectAllFilesFromConfig();
  if (files.stockFile) updateHtml(files.stockFile);
  if (files.salesDataFile) updateHtml(files.salesDataFile);
  if (files.priceFile) updateHtml(files.priceFile);
};

init();
