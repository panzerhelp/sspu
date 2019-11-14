const { ipcRenderer } = require('electron');
const fs = require('fs');
const Excel = require('exceljs');
const path = require('path');
const Columns = require('../models/Columns');
const configFilesController = require('./configFilesController');
const partController = require('../controllers/partController');
const stockController = require('../controllers/stockController');
const productController = require('../controllers/productController');
const contractController = require('../controllers/contractController');
const systemController = require('../controllers/systemController');

const sendProgressMessage = (fileType, message) => {
  ipcRenderer.send('set-progress', {
    mainItem: `Importing data files`,
    subItem: `${fileType} : ${message}`,
    curItem: 0,
    totalItem: 0
  });
};

exports.loadFile = (file, processRowCallBack) => {
  return new Promise((resolve, reject) => {
    const { filePath } = file;
    if (fs.existsSync(filePath)) {
      if (path.parse(filePath).ext === '.xlsx') {
        sendProgressMessage(file.type, 'loading fail');
        this.loadFileXLSX(file, processRowCallBack)
          .then(() => resolve())
          .catch(error => reject(error));
      } else if (path.parse(filePath).ext === '.csv') {
        this.loadFileCSV(file, processRowCallBack)
          .then(() => {
            resolve(file.type);
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
          fileTypes => {
            resolve(fileTypes);
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
      console.log('Finised workbook');
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

let productsData = {};
let systemsData = {};
let contractsData = {};

const validResposes = ['ctr6hr', 'ctr24hr', 'ons4hr', 'onsncd'];

exports.cleanUpAfterImport = () => {
  productsData = {};
  systemsData = {};
  contractsData = {};
};

exports.validateSalesData = data => {
  if (
    !data ||
    typeof data.response === 'undefined' ||
    typeof data.response !== 'string' ||
    data.response === '' ||
    typeof data.serial === 'undefined' ||
    typeof data.serial !== 'string' ||
    data.serial === '' ||
    data.serial.length < 5 ||
    validResposes.indexOf(data.response.trim().toLowerCase()) === -1
  ) {
    return false;
  }

  return true;
};

const importSalesDataFileRow = data => {
  // eslint-disable-next-line no-unused-vars
  return new Promise((resolve, reject) => {
    if (this.validateSalesData(data)) {
      if (typeof productsData[data.productNumber] === 'undefined') {
        productsData[data.productNumber] = {
          description: data.productDesc
        };
        console.log(`Queued product ${data.productNumber}`);
      }

      if (typeof systemsData[data.serial] === 'undefined') {
        systemsData[data.serial] = {
          product: data.productNumber,
          contract: data.said
        };

        console.log(`Queued system ${data.serial}`);
      }

      if (typeof contractsData[data.said] === 'undefined') {
        contractsData[data.said] = {
          startDate: data.startDate,
          endDate: data.endDate,
          response: data.response,
          customer: data.customer,
          country: data.country,
          city: data.city
        };

        console.log(`Queued contract ${data.said}`);
      }

      resolve('Resolved');
    } else {
      resolve('Invalid data');
    }
  });
};

exports.processDataRow = (fileType, row) => {
  return new Promise((resolve, reject) => {
    sendProgressMessage(fileType, `processed rows ${row._number}`);
    if (row._number === 1) {
      Columns.setIds(fileType, row);
      resolve();
    } else {
      const data = Columns.getData(fileType, row);
      if (
        fileType === 'stockFile' &&
        typeof data.partNumber !== 'undefined' &&
        data.partNumber
      ) {
        partController
          .addOnePartFromStock(data)
          .then(part => {
            resolve(part);
          })
          .catch(err => reject(err));
      } else if (fileType === 'salesDataFile') {
        importSalesDataFileRow(data)
          .then(() => {
            resolve(data);
          })
          .catch(err => {
            reject(err);
          });
      } else {
        resolve();
      }
    }
  });
};

exports.importFiles = async () => {
  try {
    const filesToLoad = configFilesController.selectAllFilesFromConfig();
    await stockController.clearStock();
    const promiseArray = [];
    filesToLoad.forEach(file => {
      promiseArray.push(this.loadFile(file, this.processDataRow));
    });

    await Promise.all(promiseArray);

    const productIds = await productController.addProducts(productsData);
    const contractIds = await contractController.addContracts(contractsData);

    await systemController.addSystems(systemsData, productIds, contractIds);

    this.cleanUpAfterImport();
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }

  // // debugger;
  // const t0 = performance.now();

  // filesToLoad.forEach(file => {
  //   promiseArray.push(this.loadFile(file, this.processDataRow));
  // });
  // Promise.all(promiseArray).then(
  //   // eslint-disable-next-line no-unused-vars
  //   fileTypes => {
  //     // console.log('Finished reading data files. Starting data import');
  //     // console.log(systemsData);
  //     // console.log(contractsData);
  //     // debugger;
  //     productController
  //       .addProducts(productsData)
  //       .then(productIds => {
  //         contractController
  //           .addContracts(contractsData)
  //           .then(contractIds => {
  //             systemController
  //               .addSystems(systemsData, productIds, contractIds)
  //               .then(systemIds => {
  //                 const t1 = performance.now();
  //                 const time = t1 - t0;
  //                 console.log(
  //                   `Data file import complete in ${time} milliseconds`
  //                 );
  //                 // console.log(productIds);
  //                 // console.log(contractIds);
  //                 // console.log(systemIds);
  //                 this.cleanUpAfterImport();
  //                 // debugger;
  //               })
  //               .catch(err => console.log(err));
  //           })
  //           .catch(err => console.log(err));
  //       })
  //       .catch(err => console.log(err));
  //   },
  //   reason => {
  //     this.cleanUpAfterImport();
  //   }
  // );
};
