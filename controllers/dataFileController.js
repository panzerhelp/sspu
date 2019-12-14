/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ipcRenderer } = require('electron');
const fs = require('fs');
const Excel = require('exceljs');
const path = require('path');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const Columns = require('../models/Columns');
const configFilesController = require('./configFilesController');
const stockController = require('../controllers/stockController');
const productController = require('../controllers/productController');
const contractController = require('../controllers/contractController');
const systemController = require('../controllers/systemController');
const configFileController = require('../controllers/configFilesController');
const dbConnect = require('../dbConnect');

dayjs.extend(customParseFormat);

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
          .then(data => resolve(data))
          .catch(error => reject(error));
      } else if (path.parse(filePath).ext === '.csv') {
        this.loadFileCSV(file, processRowCallBack)
          .then(data => {
            resolve(data);
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

const validResposes = [
  'ctr6hr',
  'ctr24hr',
  'ons4hr',
  'onsncd',
  'ctr',
  'sd',
  'nd'
];

exports.cleanUpAfterImport = () => {
  productsData = {};
  systemsData = {};
  contractsData = {};
};

const getDateFromExcel = excelDate => {
  // JavaScript dates can be constructed by passing milliseconds
  // since the Unix epoch (January 1, 1970) example: new Date(12312512312);

  // 1. Subtract number of days between Jan 1, 1900 and Jan 1, 1970, plus 1 (Google "excel leap year bug")
  // 2. Convert to milliseconds.
  const d = new Date((excelDate - (25567 + 2)) * 86400 * 1000);
  return dayjs(d).format('MMDDYY');
};

const matchCountry = country => {
  const importCountry = configFilesController.getImportCountry();
  if (
    (importCountry === 'Lithuania' && country === 'LT') ||
    (importCountry === 'Belarus' && country === 'BY') ||
    (importCountry === 'Ukraine' && country === 'UA')
  ) {
    return true;
  }
  return false;
};

exports.validateSalesData = data => {
  if (
    !data ||
    typeof data.said === 'undefined' ||
    !data.said ||
    typeof data.productNumber !== 'string' ||
    !data.productNumber ||
    (data.productNumber[0] === 'H' && !data.serial) ||
    typeof data.response === 'undefined' ||
    typeof data.response !== 'string' ||
    data.response === '' ||
    validResposes.indexOf(data.response.trim().toLowerCase()) === -1 ||
    !matchCountry(data.country)
  ) {
    return false;
  }

  if (typeof data.startDate === 'number') {
    data.startDate = getDateFromExcel(data.startDate);
  }

  if (typeof data.endDate === 'number') {
    data.endDate = getDateFromExcel(data.endDate);
  }

  if (
    typeof data.serial === 'undefined' ||
    (typeof data.serial === 'string' && data.serial.length < 5)
  ) {
    data.serial = '';
  }

  if (typeof data.serial !== 'string') {
    data.serial = data.serial.toString();
  }

  // if (!data.endDate || !data.startDate) {
  //   debugger;
  // }

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

      // key for system data is '#said-productNumber'
      const key = `#${data.said}#${data.productNumber}`;

      if (typeof systemsData[key] === 'undefined') {
        systemsData[key] = {
          product: data.productNumber,
          contract: data.said,
          serialList: []
        };
        console.log(`Queued system ${key}`);
      }

      if (data.serial) {
        systemsData[key].serialList.push(data.serial);
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
      if (fileType === 'salesDataFile') {
        importSalesDataFileRow(data)
          .then(() => {
            resolve(data);
          })
          .catch(err => {
            reject(err);
          });
      } else {
        resolve(data); // - pass data to post processing
      }
    }
  });
};

const prepareData = async type => {
  // pre-processing functions
  if (type === 'stockFile') {
    await stockController.clearStock();
  } else if (type === 'caseUsageFile') {
    await stockController.clearStockCaseUse();
  } else if (type === 'salesDataFile') {
    try {
      await systemController.clearSystems();
      await contractController.clearContracts();
    } catch (error) {
      console.log(error);
    }
  }
};

const processData = async (type, data) => {
  // post-processing functions
  if (type === 'stockFile') {
    await stockController.addStockParts(data);
  } else if (type === 'caseUsageFile') {
    await stockController.addStockPartCaseUsage(data);
  }
};

const postProcessData = async type => {
  if (type === 'salesDataFile') {
    const productIds = await productController.addProducts(productsData);
    const contractIds = await contractController.addContracts(contractsData);
    await systemController.addSystems(systemsData, productIds, contractIds);
  }
};

exports.importFiles = async () => {
  try {
    // await stockController.clearStock();
    const filesToLoad = configFilesController.selectAllFilesFromConfig();
    const fileTypes = [
      { name: 'stockFile' },
      { name: 'caseUsageFile' },
      { name: 'salesDataFile' }
    ];

    for (const type of fileTypes) {
      // prepare data types
      if (typeof type.prepared === 'undefined') {
        type.prepared = true;
        await prepareData(type.name);
      }

      for (const file of filesToLoad) {
        if (file.type === type.name) {
          const data = await this.loadFile(file, this.processDataRow);
          await processData(file.type, data);
        }
      }

      // post-process data type
      if (typeof type.processed === 'undefined') {
        type.processed = true;
        await postProcessData(type.name);
      }
    }

    this.cleanUpAfterImport();
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.clearDatabase = async () => {
  try {
    const dbFile = path.join(configFileController.getDataDir(), 'sspu.sqlite');
    let idx = 1;
    let dbCopy = `${dbFile}_bkp`;

    while (fs.existsSync(dbCopy)) {
      dbCopy = `${dbFile}_bkp${idx}`;
      idx++;
    }

    fs.copyFileSync(dbFile, dbCopy);

    await dbConnect({ force: true }); // drop all tables
    // console.log(dbCopy);
    // debugger;
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};
