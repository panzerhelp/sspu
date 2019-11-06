const fs = require('fs');
const Excel = require('exceljs');
const path = require('path');
const ConfigStore = require('../models/ConfigStore');
const Columns = require('../models/Columns');

const configStore = new ConfigStore();

exports.loadFile = (fileType, processRowCallBack) => {
  return new Promise((resolve, reject) => {
    const fileStoreObject = configStore.getValue(fileType);
    if (fileStoreObject) {
      const { filePath } = fileStoreObject;
      if (fs.existsSync(filePath)) {
        if (path.parse(filePath).ext === '.xlsx') {
          this.loadFileXLSX(filePath, processRowCallBack)
            .then(() => resolve())
            .catch(error => reject(error));
        } else if (path.parse(filePath).ext === '.csv') {
          this.loadFileCSV(filePath, processRowCallBack)
            .then(() => resolve())
            .catch(error => reject(error));
        } else {
          reject(new Error(`${filePath}: wrong file type`));
        }
      } else {
        reject(new Error(`${fileType}: file does not exist`));
      }
    } else {
      reject(new Error(`${fileType}: not defined in configuration`));
    }
  });
};

exports.loadFileCSV = (filePath, processRowCallBack) => {
  return new Promise((resolve, reject) => {
    const workbook = new Excel.Workbook();
    workbook.csv
      .readFile(filePath)
      .then(worksheet => {
        worksheet.eachRow(row => {
          processRowCallBack(row);
        });
        resolve();
      })
      .catch(error => reject(error));
  });
};

exports.loadFileXLSX = (filePath, processRowCallBack) => {
  return new Promise((resolve, reject) => {
    const workbook = new Excel.stream.xlsx.WorkbookReader();
    const options = {
      entries: 'emit',
      sharedStrings: 'cache',
      styles: 'emit',
      hyperlinks: 'emit',
      worksheets: 'emit'
    };

    workbook.on('error', function(error) {
      console.log('An error occurred while writing reading excel', error);
      reject(error);
    });

    workbook.on('entry', function(entry) {
      console.log('entry', entry);
    });

    workbook.on('shared-string', function(index, text) {
      console.log('index:', index, 'text:', text);
    });

    workbook.on('worksheet', function(worksheet) {
      worksheet.on('row', row => {
        processRowCallBack(row);
        // workaround to stop reading stream
        // workbook.zip.unpipe();
        // workbook.zip.destroy();
      });

      worksheet.on('close', function() {
        console.log('worksheet close');
      });

      worksheet.on('finished', function() {
        console.log('worksheet finished');
      });
    });

    workbook.on('finished', function() {
      console.log('finished');
      resolve();
    });

    workbook.on('close', function() {
      console.log('close');
    });

    const stream = fs.createReadStream(filePath);
    workbook.read(stream, options);
  });
};

// eslint-disable-next-line no-unused-vars
const stockFileText = document.getElementById(`stockFileInfo`);
// eslint-disable-next-line no-unused-vars
const salesDataFileText = document.getElementById(`salesDataFileInfo`);

exports.importFiles = async () => {
  const filesToLoad = ['stockFile', 'salesDataFile'];

  filesToLoad.forEach(file => {
    console.log(file);

    this.loadFile(file, row => {
      if (row._number === 1) {
        Columns.setIds(file, row);
      } else {
        Columns.setData(file, row);
      }

      document.getElementById(
        `${file}Info`
      ).innerHTML = `loading ${row._number} <i class="fas fa-table"></i>`;
    })
      .then(() => {
        console.log(`${file} : loaded succesfully`);
        debugger;
      })
      .catch(err => console.log(err));
  });
};
