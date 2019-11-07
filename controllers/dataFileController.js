const fs = require('fs');
const Excel = require('exceljs');
const path = require('path');
const Columns = require('../models/Columns');
const configFilesController = require('./configFilesController');

exports.loadFile = (file, processRowCallBack) => {
  return new Promise((resolve, reject) => {
    const { filePath } = file;
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
      reject(new Error(`${file.name}: file does not exist`));
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

exports.importFiles = async () => {
  // const filesToLoad = ['stockFile', 'salesDataFile'];
  const filesToLoad = configFilesController.selectAllFilesFromConfig();
  debugger;
  filesToLoad.forEach(file => {
    this.loadFile(file, row => {
      if (row._number === 1) {
        Columns.setIds(file.type, row);
      } else {
        Columns.setData(file.type, row);
      }

      // document.getElementById(
      //  `${file.type}Info`
      // ).innerHTML = `loading ${row._number} <i class="fas fa-table"></i>`;
    })
      .then(() => {
        console.log(`${file.name} : loaded succesfully`);
      })
      .catch(err => console.log(err));
  });
};
