const fs = require('fs');
const Excel = require('exceljs');
const path = require('path');
const Columns = require('../models/Columns');
const configFilesController = require('./configFilesController');
const partController = require('../controllers/partController');
const stockController = require('../controllers/stockController');

exports.loadFile = (file, processRowCallBack) => {
  return new Promise((resolve, reject) => {
    const { filePath } = file;
    if (fs.existsSync(filePath)) {
      if (path.parse(filePath).ext === '.xlsx') {
        this.loadFileXLSX(file, processRowCallBack)
          .then(() => resolve())
          .catch(error => reject(error));
      } else if (path.parse(filePath).ext === '.csv') {
        this.loadFileCSV(file, processRowCallBack)
          .then(() => {
            resolve();
          })
          .catch(error => reject(error));
      } else {
        reject(new Error(`${filePath}: wrong file type`));
      }
    } else {
      reject(new Error(`${file.name}: file does not exist`));
    }
  });
};

exports.loadFileCSV = (file, processRowCallBack) => {
  return new Promise((resolve, reject) => {
    const workbook = new Excel.Workbook();
    const options = {
      dateFormats: []
    };

    const promiseArray = [];

    workbook.csv
      .readFile(file.filePath, options)
      .then(worksheet => {
        worksheet.eachRow(row => {
          promiseArray.push(processRowCallBack(file.type, row));
        });

        Promise.all(promiseArray).then(
          value => {
            resolve(value);
          },
          reason => {
            reject(reason);
          }
        );
      })
      .catch(error => reject(error));
  });
};

exports.loadFileXLSX = (file, processRowCallBack) => {
  return new Promise((resolve, reject) => {
    const promiseArray = [];
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
        promiseArray.push(processRowCallBack(file.type, row));
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
      Promise.all(promiseArray).then(
        value => {
          resolve(value);
        },
        reason => {
          reject(reason);
        }
      );
    });

    workbook.on('close', function() {
      console.log('close');
    });

    const stream = fs.createReadStream(file.filePath);
    workbook.read(stream, options);
  });
};

exports.processDataRow = (fileType, row) => {
  return new Promise((resolve, reject) => {
    if (row._number === 1) {
      Columns.setIds(fileType, row);
      resolve();
    } else {
      const data = Columns.getData(fileType, row);
      if (fileType === 'stockFile' && typeof data.partNumber !== 'undefined') {
        partController
          .addOnePartFromStock(data)
          .then(part => {
            resolve(part);
          })
          .catch(err => reject(err));
      } else {
        resolve();
      }
    }
  });
};

exports.importFiles = async () => {
  const filesToLoad = configFilesController.selectAllFilesFromConfig();

  const promiseArray = [];

  await stockController.clearStock();
  // debugger;
  const t0 = performance.now();

  filesToLoad.forEach(file => {
    promiseArray.push(this.loadFile(file, this.processDataRow));
    // // file promise
    // const promise = new Promise((resolve, reject) => {
    //   const partArray = [];
    //   this.loadFile(file, async row => {
    //     if (row._number === 1) {
    //       Columns.setIds(file.type, row);
    //     } else {
    //       const data = Columns.getData(file.type, row);
    //       if (
    //         file.type === 'stockFile' &&
    //         typeof data.partNumber !== 'undefined'
    //       ) {
    //         partArray.push(data);
    //       }
    //     }
    //   })
    //     .then(() => {
    //       console.log(`${file.name} : loaded succesfully`);
    //       partController
    //         .addStockParts(partArray)
    //         .then(resolve(file.name))
    //         .catch(reject(file.name));
    //     })
    //     .catch(err => console.log(err));
    // });

    // promiseArray.push(promise);
  });
  Promise.all(promiseArray).then(
    // eslint-disable-next-line no-unused-vars
    _value => {
      const t1 = performance.now();
      // eslint-disable-next-line prefer-template
      // debugger;
      const time = t1 - t0;
      console.log(`Data file import complete in ${time} milliseconds`);
      debugger;
    },
    reason => {
      console.log(reason);
      debugger;
    }
  );
};
