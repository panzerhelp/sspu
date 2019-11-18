/* eslint-disable max-classes-per-file */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
const { ipcRenderer } = require('electron');
const Excel = require('exceljs');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const Stock = require('../models/Stock');
const Part = require('../models/Part');
const configFileController = require('../controllers/configFilesController');
const partController = require('../controllers/partController');
const systemController = require('../controllers/systemController');

dayjs.extend(customParseFormat);

const getOutputFile = type => {
  const fileNames = {
    stockUsage: 'Stock Usage Report.xlsx'
  };

  const dir = path.join(configFileController.getDataDir(), 'reports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  const outdir = path.join(dir, configFileController.getImportCountry());
  if (!fs.existsSync(outdir)) fs.mkdirSync(outdir);

  return path.join(
    outdir,
    `${configFileController.getImportCountry()} ${fileNames[type]}`
  );
};

class XCol {
  constructor(id, title, width, subColumns) {
    this.id = id;
    this.title = title;
    this.width = width;
    this.subColumns = subColumns;
  }
}

const partUsageColumns = [
  new XCol(1, 'Part Number', 15, []),
  new XCol(2, 'Description', 40, []),
  new XCol(3, 'Qty', 5, []),
  new XCol(4, 'Case Use', 15, []),
  new XCol(5, 'Price', 5, []),
  new XCol(6, 'Field Equiv', 20, []),
  new XCol(7, 'Active', 10, [
    new XCol(7, 'CTR+SD', 10, []),
    new XCol(8, 'CTR', 10, []),
    new XCol(9, 'SD', 10, []),
    new XCol(10, 'ND', 10, [])
  ]),
  new XCol(11, 'Active 6m', 10, [
    new XCol(11, 'CTR+SD', 10, []),
    new XCol(12, 'CTR', 10, []),
    new XCol(13, 'SD', 10, []),
    new XCol(14, 'ND', 10, [])
  ]),
  new XCol(15, 'Expired', 10, [
    new XCol(15, 'CTR+SD', 10, []),
    new XCol(16, 'CTR', 10, []),
    new XCol(17, 'SD', 10, []),
    new XCol(18, 'ND', 10, [])
  ]),
  new XCol(19, 'Customer', 40, []),
  new XCol(20, 'SAID', 14, []),
  new XCol(21, 'SLA', 10, []),
  new XCol(22, 'Status', 15, []),
  new XCol(23, 'Start', 15, []),
  new XCol(24, 'End', 15, []),
  new XCol(25, 'Serials', 15, []),
  new XCol(26, 'Product', 14, []),
  new XCol(27, 'Desciption', 20, []),
  new XCol(28, 'Qty', 10, []),
  new XCol(29, 'FE', 10, [])
];

const addOneRow = (columns, sheet, subRow) => {
  let hasSubRow = false;
  const values = [];

  columns.forEach(column => {
    if (!subRow || !column.subColumns.length) {
      values.push(column.title);
    }

    let subCols = 0;
    column.subColumns.forEach(subCol => {
      if (subCols && !subRow) {
        values.push('');
        hasSubRow = true;
      } else if (subRow) {
        values.push(subCol.title);
      }
      subCols++;
    });
  });
  sheet.addRow(values);
  return hasSubRow;
};

const addTitleRow = (title, columns, sheet) => {
  sheet.addRow([title]);
  sheet.mergeCells(
    sheet.lastRow._number,
    1,
    sheet.lastRow._number,
    columns[columns.length - 1].id
  );

  sheet.getCell(1, 1).font = {
    size: 18,
    bold: true,
    color: { argb: 'FFFFFFFF' }
  };
  sheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF333333' },
    bgColor: { argb: 'FF333333' }
  };
};

const addMainRow = (columns, sheet) => {
  const hasSubRow = addOneRow(columns, sheet, false);
  if (hasSubRow) {
    addOneRow(columns, sheet, true);
  }

  // merge cells
  const firstRow = sheet.lastRow._number - 1;
  columns.forEach(column => {
    if (column.subColumns.length) {
      sheet.mergeCells(
        firstRow,
        column.id,
        firstRow,
        column.id + column.subColumns.length - 1
      );
    } else {
      sheet.mergeCells(firstRow, column.id, firstRow + 1, column.id);
    }

    sheet.getCell(firstRow, column.id).alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };
  });
};

const setColWidth = (columns, sheet) => {
  columns.forEach(column => {
    if (column.subColumns.length) {
      column.subColumns.forEach(
        // eslint-disable-next-line no-return-assign
        subCol => (sheet.getColumn(subCol.id).width = subCol.width)
      );
    } else {
      sheet.getColumn(column.id).width = column.width;
    }
  });
};

const getContractsStatus = contract => {
  const endDate = dayjs(contract.endDate, 'MMDDYY');

  if (endDate.isBefore(dayjs())) {
    return 'expired';
  }

  if (endDate.isBefore(dayjs().add(6, 'month'))) {
    return 'active6m';
  }

  return 'active';
};

const getContractType = contract => {
  if (contract.response.toLowerCase().indexOf('ctr') !== -1) {
    return 'ctr';
  }

  if (contract.response.toLowerCase().indexOf('4h') !== -1) {
    return 'sd';
  }

  return 'nd';
};

const setPartStatus = contracts => {
  const partStat = {
    active: {
      ctr: 0,
      sd: 0,
      nd: 0
    },
    active6m: {
      ctr: 0,
      sd: 0,
      nd: 0
    },
    expired: {
      ctr: 0,
      sd: 0,
      nd: 0
    }
  };

  Object.keys(contracts).forEach(said => {
    Object.keys(contracts[said]).forEach(product => {
      const { contract } = contracts[said][product].systems[0];
      const status = getContractsStatus(contract);
      const type = getContractType(contract);
      partStat[status][type] += contracts[said][product].serials.length;
    });
  });

  return partStat;
};

const groupSystemsByContracts = systems => {
  const contracts = {};

  systems.sort((a, b) => {
    const compare = a.contract.response.localeCompare(b.contract.response);
    if (compare === 0) {
      return a.contract.customer.localeCompare(b.contract.customer);
    }

    return compare;
  });

  systems.forEach(system => {
    if (typeof contracts[system.contract.said] === 'undefined') {
      contracts[system.contract.said] = {};
    }

    if (
      typeof contracts[system.contract.said][system.product.productNumber] ===
      'undefined'
    ) {
      contracts[system.contract.said][system.product.productNumber] = {};

      contracts[system.contract.said][
        system.product.productNumber
      ].systems = [];

      contracts[system.contract.said][
        system.product.productNumber
      ].serials = [];
    }
    contracts[system.contract.said][system.product.productNumber].systems.push(
      system
    );

    contracts[system.contract.said][system.product.productNumber].serials.push(
      system.serial
    );
  });
  return contracts;
};

const addStockPartRow = async (stockPart, sheet) => {
  const feParts = await partController.getPartFieldEquiv(stockPart);
  const fePartIds = feParts.map(p => p.id);
  const systems = await systemController.findSystemsWithPart([
    ...fePartIds,
    stockPart.part.id
  ]);

  // group by contracts / products
  const contracts = groupSystemsByContracts(systems);
  const partStatus = setPartStatus(contracts);

  await sheet.addRow([
    stockPart.part.partNumber,
    stockPart.part.description || stockPart.part.descriptionShort,
    parseInt(stockPart.qty, 10),
    parseInt(stockPart.caseUse, 10),
    stockPart.part.price ? parseFloat(stockPart.part.price) : '',
    feParts.length ? [...feParts].map(e => e.partNumber).join(',') : '',
    partStatus.active.ctr + partStatus.active.sd,
    partStatus.active.ctr,
    partStatus.active.sd,
    partStatus.active.nd,
    partStatus.active6m.ctr + partStatus.active6m.sd,
    partStatus.active6m.ctr,
    partStatus.active6m.sd,
    partStatus.active6m.nd,
    partStatus.expired.ctr + partStatus.expired.sd,
    partStatus.expired.ctr,
    partStatus.expired.sd,
    partStatus.expired.nd,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ]);

  // eslint-disable-next-line no-unused-vars
  sheet.lastRow.eachCell((cell, collNumber) => {
    let color = 'FFFFFFFF';

    if (
      partStatus.active.ctr +
        partStatus.active.sd +
        partStatus.active6m.ctr +
        partStatus.active6m.sd <
      1
    ) {
      color = 'FFFFA5A5';
    } else if (partStatus.active.ctr + partStatus.active.sd < 1) {
      color = 'FFFFE5E5';
    }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: color },
      bgColor: { argb: color }
    };
    cell.border = { top: { style: 'thin' } };
  });

  Object.keys(contracts).forEach(said => {
    Object.keys(contracts[said]).forEach(product => {
      const s = contracts[said][product].systems;

      // if (!s[0].parts && !s[0].product.parts) {
      //   debugger;
      // }

      let parts;
      if (s[0].parts) {
        parts = s[0].parts.map(p => p.partNumber);
      } else if (s[0].product.parts) {
        parts = s[0].product.parts.map(p => p.partNumber);
      }
      //  debugger;

      sheet.addRow([
        '', // 1
        '', // 2
        '', // 3
        '', // 4
        '', // 5
        '', // 6
        '', // 7
        '', // 8
        '', // 9
        '', // 10
        '', // 11
        '', // 12
        '', // 13
        '', // 14
        '', // 15
        '', // 16
        '', // 17
        '', // 18
        `${s[0].contract.customer} - ${s[0].contract.city}`, // 19
        `'${s[0].contract.said}`, // 20
        s[0].contract.response, // 21
        getContractsStatus(s[0].contract), // status 22
        dayjs(s[0].contract.startDate, 'MMDDYY').format('MM/DD/YYYY'), // 23
        dayjs(s[0].contract.endDate, 'MMDDYY').format('MM/DD/YYYY'), // 24
        contracts[said][product].serials.join(','), // 25
        product, // p, // 26
        s[0].product.description, // list[c][s][p].prodDesc, // 27
        contracts[said][product].serials.length, // list[c][s][p].qty, // 28
        parts ? parts.join(',') : '', // list[c][s][p].equiv, // 29
        '' // list[c][s][p].wasSearched // 30
      ]);

      // eslint-disable-next-line no-unused-vars
      sheet.lastRow.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' },
          bgColor: { argb: 'FFFFFFFF' }
        };
      });
    });
  });

  return Promise.resolve();
};

const checkFileBusy = async outFile => {
  if (!fs.existsSync(outFile)) {
    return Promise.resolve();
  }

  let filehandle;
  try {
    filehandle = await fsPromises.open(outFile, 'r+');
    if (filehandle !== undefined) await filehandle.close();
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

const generateStockPartUsageReport = async () => {
  try {
    const outFile = getOutputFile('stockUsage');
    await checkFileBusy(outFile);
    const stockParts = await Stock.findAll({
      where: {},
      include: [{ model: Part }]
    });

    if (stockParts.length) {
      const wb = new Excel.Workbook();
      const sheet = wb.addWorksheet('Stock Usage', {
        views: [{ state: 'frozen', ySplit: 3 }],
        properties: { tabColor: { argb: 'FFFFFFFF' } }
      });

      const date = dayjs().format('YYYY-MMM-DD');
      const country = configFileController.getImportCountry();
      addTitleRow(
        `${country} - Stock Part Usage (${date})`,
        partUsageColumns,
        sheet
      );
      addMainRow(partUsageColumns, sheet);

      let curItem = 1;
      for (const stockPart of stockParts) {
        ipcRenderer.send('set-progress', {
          mainItem: `Generating part usage report`,
          subItem: stockPart.part.partNumber,
          curItem: curItem,
          totalItem: stockParts.length
        });

        await addStockPartRow(stockPart, sheet);
        curItem++;
      }

      sheet.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: sheet.lastRow._number, column: sheet.columnCount }
      };

      setColWidth(partUsageColumns, sheet);
      await wb.xlsx.writeFile(outFile);
    }

    return Promise.resolve(outFile);
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.generateReports = async () => {
  try {
    const reportFile = await generateStockPartUsageReport();
    return Promise.resolve(reportFile);
  } catch (error) {
    return Promise.reject(error);
  }
};
