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

const configFilesController = require('../configFilesController');
const stockController = require('../stockController');

const XCol = require('./utils/XCol');

const createPartContractFile = require('./createPartContractFile');

dayjs.extend(customParseFormat);

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
  ]) // ,
];

const addStockPartRow = async (stockPart, sheet, dir) => {
  const [partStatus, feParts] = await createPartContractFile(
    stockPart.part,
    dir
  );

  await sheet.addRow([
    // stockPart.part.partNumber,

    {
      text: stockPart.part.partNumber,
      hyperlink: `parts\\${stockPart.part.partNumber}.xlsx`,
      tooltip: `${stockPart.part.partNumber} - products\\${stockPart.part.partNumber}.xlsx`
    },

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
    partStatus.expired.nd // ,
  ]);

  sheet.lastRow.getCell(1).font = {
    color: { argb: '000000ff' },
    underline: 'single'
  };

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
          subItem: stockPart.part.partNumber,
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
