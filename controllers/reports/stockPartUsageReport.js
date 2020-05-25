/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
const { ipcRenderer } = require('electron');
const Excel = require('exceljs');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');

const checkFileBusy = require('./utils/checkFileBusy');
const addTitleRow = require('./utils/addTitleRow');
const addMainRow = require('./utils/addMainRow');
const setColWidth = require('./utils/setColWidth');
const colNum = require('./utils/colNum');
const Color = require('./utils/Color');

const configFilesController = require('../configFilesController');
const stockController = require('../stockController');

const XCol = require('./utils/XCol');

const createPartContractFile = require('./createPartContractFile');

dayjs.extend(customParseFormat);

const partUsageColumns = [
  new XCol(1, 'Part Number', 15, []),
  new XCol(2, 'Description', 40, []),
  new XCol(3, 'Field Equiv', 20, []),
  new XCol(4, 'Price', 10, []),
  new XCol(5, 'Cases', 15, []),
  new XCol(6, 'Stock Mis Cases', 15, []),
  new XCol(7, 'Stock Location', 15, []),
  new XCol(8, 'Qty', 5, []),
  new XCol(9, 'Active', 10, [
    new XCol(9, 'CTR+SD', 10, []),
    new XCol(10, 'CTR', 10, []),
    new XCol(11, 'SD', 10, []),
    new XCol(12, 'ND', 10, [])
  ]),
  new XCol(13, 'Active 6m', 10, [
    new XCol(13, 'CTR+SD', 10, []),
    new XCol(14, 'CTR', 10, []),
    new XCol(15, 'SD', 10, []),
    new XCol(16, 'ND', 10, [])
  ]),
  new XCol(17, 'Expired', 10, [
    new XCol(18, 'CTR+SD', 10, []),
    new XCol(19, 'CTR', 10, []),
    new XCol(20, 'SD', 10, []),
    new XCol(21, 'ND', 10, [])
  ]) // ,
];

const addStockPartRow = async (stockPart, sheet, dir) => {
  const feParts = await createPartContractFile(stockPart, dir);

  let rowId = 1;

  for (const stock of stockPart.stocks) {
    const { partStatus } = stock;
    const fePartsStr = feParts.length
      ? [...feParts].map(e => e.partNumber).join(',')
      : '';
    const priceStr = stockPart.price ? parseFloat(stockPart.price) : '';

    await sheet.addRow([
      {
        text: stockPart.partNumber,
        hyperlink: `parts\\${stockPart.partNumber}.xlsx`,
        tooltip: `${stockPart.partNumber} - products\\${stockPart.partNumber}.xlsx`
      },
      stockPart.description || stockPart.descriptionShort,
      fePartsStr,
      priceStr,
      stockPart.caseParts.length,
      stockPart.getStockMiss(),
      stock.location,
      stock.qty,
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
      partStatus.expired.nd // ,
    ]);

    sheet.lastRow.getCell(1).font = {
      color: { argb: '000000ff' },
      underline: 'single'
    };

    // eslint-disable-next-line no-unused-vars
    // eslint-disable-next-line no-loop-func
    sheet.lastRow.eachCell((cell, collNumber) => {
      let color = Color.WHITE;

      if (
        (collNumber > 6 && partStatus.isInactive()) ||
        stockPart.partStatus.isInactive()
      ) {
        color = Color.RED_SOLID;
      } else if (
        (collNumber > 6 && partStatus.isInactive6m()) ||
        stockPart.partStatus.isInactive6m()
      ) {
        color = Color.RED;
      }

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: color },
        bgColor: { argb: color }
      };

      if (rowId === 1) {
        cell.border = { top: { style: 'thin' } };
      }
    });

    rowId++;
  }

  if (stockPart.stocks.length > 1) {
    for (let colNumber = 1; colNumber <= 6; colNumber++) {
      const firstRow = sheet.lastRow._number - (stockPart.stocks.length - 1);
      sheet.mergeCells(firstRow, colNumber, sheet.lastRow._number, colNumber);

      sheet.getCell(firstRow, colNumber).alignment = {
        vertical: 'top',
        horizontal: colNumber < 5 ? 'left' : 'right'
      };
    }
  }

  return Promise.resolve();
};

const stockPartUsageReport = async () => {
  try {
    const outFile = configFilesController.getOutputFile('stockUsage');
    await checkFileBusy(outFile);

    const dir = path.join(path.dirname(outFile), 'parts');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    fse.emptyDirSync(dir);
    const stockParts = await stockController.getAllStockParts();

    if (stockParts.length) {
      const wb = new Excel.stream.xlsx.WorkbookWriter({
        filename: outFile,
        useStyles: true,
        useSharedStrings: true
      });
      const sheet = wb.addWorksheet('Stock Usage', {
        views: [{ state: 'frozen', ySplit: 3 }],
        properties: { tabColor: { argb: 'FFFFFFFF' } }
      });

      addTitleRow('Stock Part Usage', partUsageColumns, sheet);
      addMainRow(partUsageColumns, sheet);

      let curItem = 1;
      for (const stockPart of stockParts) {
        ipcRenderer.send('set-progress', {
          mainItem: `Generating part usage report`,
          subItem: stockPart.partNumber,
          curItem: curItem,
          totalItem: stockParts.length
        });
        await addStockPartRow(stockPart, sheet, dir);
        curItem++;
      }

      sheet.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: sheet.lastRow._number, column: colNum(partUsageColumns) }
      };

      setColWidth(partUsageColumns, sheet);
      await wb.commit();
      // await wb.xlsx.writeFile(outFile);
    }

    return Promise.resolve(outFile);
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = stockPartUsageReport;
