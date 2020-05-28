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

let id = 1;
const partUsageColumns = [
  new XCol(id++, 'Part Number', 15, []),
  new XCol(id++, 'Description', 40, []),
  new XCol(id++, 'Field Equiv', 20, []),
  new XCol(id++, 'Price', 10, []),
  new XCol(id++, 'WoH Avg', 12, []),
  new XCol(id++, 'WoH Last', 12, []),
  new XCol(id++, 'Cases', 12, []),
  new XCol(id++, 'Stock Mis Cases', 12, []),
  new XCol(id++, 'Stock Location', 13, []),
  new XCol(id++, 'Qty', 5, []),
  new XCol(id, 'Active', 10, [
    new XCol(id++, 'CTR+SD', 10, []),
    new XCol(id++, 'CTR', 10, []),
    new XCol(id++, 'SD', 10, []),
    new XCol(id++, 'ND', 10, [])
  ]),
  new XCol(id, 'Active 6m', 10, [
    new XCol(id++, 'CTR+SD', 10, []),
    new XCol(id++, 'CTR', 10, []),
    new XCol(id++, 'SD', 10, []),
    new XCol(id++, 'ND', 10, [])
  ]),
  new XCol(id, 'Expired', 10, [
    new XCol(id++, 'CTR+SD', 10, []),
    new XCol(id++, 'CTR', 10, []),
    new XCol(id++, 'SD', 10, []),
    new XCol(id++, 'ND', 10, [])
  ]) // ,
];

const PART_COL_NUM = 4; // columns which are common for the part

const addStockPartRow = async (stockPart, sheet, dir) => {
  const feParts = await createPartContractFile(stockPart, dir);

  let rowId = 1;

  for (const stock of stockPart.stocks) {
    const { partStatus } = stock;
    const fePartsStr = feParts.length
      ? [...feParts].map(e => e.partNumber).join(',')
      : '';
    const priceStr = stockPart.price ? parseFloat(stockPart.price) : '';

    const [wohAvg, wohLast] = stockPart.getWeeksOnHand(stock);

    await sheet.addRow([
      {
        text: stockPart.partNumber,
        hyperlink: `parts\\${stockPart.partNumber}.xlsx`,
        tooltip: `${stockPart.partNumber} - products\\${stockPart.partNumber}.xlsx`
      },
      stockPart.description || stockPart.descriptionShort,
      fePartsStr,
      priceStr,
      wohAvg, // weeks on hand avg
      wohLast, // weeks on hand last
      stockPart.caseParts.length,
      stockPart.getStockMiss(stock.location),
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
        (collNumber > PART_COL_NUM && partStatus.isInactive()) ||
        stockPart.partStatus.isInactive()
      ) {
        color = Color.RED_SOLID;
      } else if (
        (collNumber > PART_COL_NUM && partStatus.isInactive6m()) ||
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
    for (let colNumber = 1; colNumber <= PART_COL_NUM; colNumber++) {
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
