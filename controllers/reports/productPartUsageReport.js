/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
const { ipcRenderer } = require('electron');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const Excel = require('exceljs');

const addTitleRow = require('./utils/addTitleRow');
const addMainRow = require('./utils/addMainRow');
const setColWidth = require('./utils/setColWidth');
const fillCell = require('./utils/fillCell');
const Color = require('./utils/Color');
const colNum = require('./utils/colNum');
const XCol = require('./utils/XCol');

const checkFileBusy = require('./utils/checkFileBusy');
const configFilesController = require('../configFilesController');
const systemController = require('../systemController');

const createProductContractFile = require('./createProductContractFile');
const caseController = require('../caseController');

const productListColumns = [
  new XCol(1, 'Product', 20, []),
  new XCol(2, 'Description', 40, []),
  new XCol(3, 'Cases', 15, []),
  new XCol(4, 'Stock Mis Cases', 15, []),
  new XCol(5, 'Parts BOM', 20, []),
  new XCol(6, 'Stock Location', 20, []),
  new XCol(7, 'Parts Stock', 20, []),
  new XCol(8, 'Contract Count', 15, []),
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
    new XCol(17, 'CTR+SD', 10, []),
    new XCol(18, 'CTR', 10, []),
    new XCol(19, 'SD', 10, []),
    new XCol(20, 'ND', 10, [])
  ]),
  new XCol(21, 'CTR + SD / Active + 6m', 20, [])
];

// const PARTS_BOM_ROW = 5;
const CTR_SD_ACTIVE_ROW = 21;
const PARTS_STOCK_ROW = 7;

const addProductRow = async (system, sheet, dir) => {
  try {
    const productNumber = system.product.productNumber || 'NO_NAME';
    const [stockList, partsBom] = await createProductContractFile(
      system.product,
      dir
    );

    const cases = await caseController.findCasesWithProduct(productNumber);

    let stockMis = 0;
    cases.forEach(case_ => {
      case_.caseParts.forEach(part => {
        stockMis += part.isStockMiss();
      });
    });

    const prodValues = [
      partsBom > 0
        ? {
            text: productNumber,
            hyperlink: `products\\${productNumber}.xlsx`,
            tooltip: `${productNumber} - products\\${productNumber}.xlsx`
          }
        : {
            text: productNumber,
            hyperlink: `https://partsurfer.hpe.com/Search.aspx?SearchText=${productNumber}`,
            tooltip: `${productNumber} - https://partsurfer.hpe.com/Search.aspx?SearchText=${productNumber}`
          },
      system.product.description,
      cases.length,
      stockMis,
      partsBom
    ];

    const addRow_ = rowValues => {
      sheet.addRow(rowValues);

      // if (rowValues[PARTS_BOM_ROW - 1] > 0) {
      sheet.lastRow.getCell(1).font = {
        color: { argb: '000000ff' },
        underline: 'single'
      };
      // }

      if (
        rowValues[CTR_SD_ACTIVE_ROW - 1] > 0 &&
        rowValues[PARTS_STOCK_ROW - 1] < 1
      ) {
        sheet.lastRow.eachCell(cell => {
          fillCell.solid(cell, Color.RED);
        });
      } else {
        sheet.lastRow.eachCell(cell => {
          fillCell.solid(cell, Color.WHITE);
        });
      }
    };

    sheet.lastRow.eachCell(cell => {
      cell.border = { bottom: { style: 'thin' } };
    });

    let activeStocks = 0;

    if (stockList) {
      for (const stock of stockList) {
        const contractCount = stock.prodStatus.total();
        if (contractCount) {
          activeStocks++;
          const status = stock.prodStatus;
          const rowValues = [
            ...prodValues,
            ...[
              stock.name,
              stock.qty,
              contractCount,
              status.active.ctr + status.active.sd,
              status.active.ctr,
              status.active.sd,
              status.active.nd,
              status.active6m.ctr + status.active6m.sd,
              status.active6m.ctr,
              status.active6m.sd,
              status.active6m.nd,
              status.expired.ctr + status.expired.sd,
              status.expired.ctr,
              status.expired.sd,
              status.expired.nd,
              status.active.ctr +
                status.active.sd +
                status.active6m.ctr +
                status.active6m.sd
            ]
          ];

          addRow_(rowValues);
        }
      }

      if (activeStocks > 1) {
        for (let colNumber = 1; colNumber <= 3; colNumber++) {
          const firstRow = sheet.lastRow._number - (activeStocks - 1);
          sheet.mergeCells(
            firstRow,
            colNumber,
            sheet.lastRow._number,
            colNumber
          );

          sheet.getCell(firstRow, colNumber).alignment = {
            vertical: 'top',
            horizontal: colNumber < 3 ? 'left' : 'right'
          };
        }
      }
    }

    if (!activeStocks) {
      const zeroes_ = new Array(15).fill(0);
      const rowValues = [...prodValues, '', ...zeroes_];
      addRow_(rowValues);
      sheet.lastRow.eachCell(cell => {
        fillCell.solid(cell, Color.GREY);
      });
    }
    Promise.resolve();
  } catch (error) {
    Promise.reject(error);
  }
};

const productPartUsageReport = async () => {
  try {
    const outFile = configFilesController.getOutputFile('productUsage');
    await checkFileBusy(outFile);

    const dir = path.join(path.dirname(outFile), 'products');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    fse.emptyDirSync(dir);

    const systems = await systemController.getAllSystems();

    // eslint-disable-next-line no-const-assign
    // systems = systems.slice(0, 100); // test first 5 products

    const wb = new Excel.stream.xlsx.WorkbookWriter({
      filename: outFile,
      useStyles: true,
      useSharedStrings: true
    });

    const sheet = wb.addWorksheet('Products', {
      views: [{ state: 'frozen', ySplit: 3 }],
      properties: { tabColor: { argb: 'FFFFFFFF' } }
    });

    addTitleRow('Product Part Usage', productListColumns, sheet);
    addMainRow(productListColumns, sheet);

    let curItem = 1;
    for (const system of systems) {
      ipcRenderer.send('set-progress', {
        mainItem: `Generating product usage report`,
        subItem: system.product.productNumber,
        curItem: curItem,
        totalItem: systems.length
      });
      await addProductRow(system, sheet, dir);

      curItem++;
    }

    sheet.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: sheet.lastRow._number, column: colNum(productListColumns) }
    };

    setColWidth(productListColumns, sheet);
    await wb.commit();
    return Promise.resolve(outFile);
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = productPartUsageReport;
