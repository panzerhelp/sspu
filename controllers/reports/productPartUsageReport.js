/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
const { ipcRenderer } = require('electron');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const Excel = require('exceljs');
// const dayjs = require('dayjs');
// const customParseFormat = require('dayjs/plugin/customParseFormat');
const sequelize = require('sequelize');

const addTitleRow = require('./utils/addTitleRow');
const addMainRow = require('./utils/addMainRow');
const setColWidth = require('./utils/setColWidth');
const fillCell = require('./utils/fillCell');
const Color = require('./utils/Color');
const colNum = require('./utils/colNum');
const XCol = require('./utils/XCol');

const checkFileBusy = require('./utils/checkFileBusy');
const configFilesController = require('../configFilesController');
const System = require('../../models/System');
const Product = require('../../models/Product');

const createProductContractFile = require('./createProductContractFile');

const productListColumns = [
  new XCol(1, 'Product', 20, []),
  new XCol(2, 'Description', 40, []),
  new XCol(3, 'Parts BOM', 20, []),
  new XCol(4, 'Parts Stock', 20, []),
  new XCol(5, 'Contract Count', 15, []),
  new XCol(6, 'Active', 10, [
    new XCol(6, 'CTR+SD', 10, []),
    new XCol(7, 'CTR', 10, []),
    new XCol(8, 'SD', 10, []),
    new XCol(9, 'ND', 10, [])
  ]),
  new XCol(10, 'Active 6m', 10, [
    new XCol(10, 'CTR+SD', 10, []),
    new XCol(11, 'CTR', 10, []),
    new XCol(12, 'SD', 10, []),
    new XCol(13, 'ND', 10, [])
  ]),
  new XCol(14, 'Expired', 10, [
    new XCol(14, 'CTR+SD', 10, []),
    new XCol(15, 'CTR', 10, []),
    new XCol(16, 'SD', 10, []),
    new XCol(17, 'ND', 10, [])
  ]),
  new XCol(18, 'CTR + SD / Active + 6m', 20, [])
];

const addProductRow = async (system, sheet, dir) => {
  try {
    const productNumber = system.product.productNumber || 'NO_NAME';
    const [status, partsBom, partsStock] = await createProductContractFile(
      system.product,
      dir
    );

    await sheet.addRow([
      {
        text: productNumber,
        hyperlink: `products\\${productNumber}.xlsx`,
        tooltip: `${productNumber} - products\\${productNumber}.xlsx`
      },
      // productNumber,
      system.product.description,
      partsBom,
      partsStock,
      system.dataValues.productCount,
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
    ]);

    sheet.lastRow.getCell(1).font = {
      color: { argb: '000000ff' },
      underline: 'single'
    };

    if (sheet.lastRow.getCell(18) > 0 && sheet.lastRow.getCell(4) < 1) {
      sheet.lastRow.eachCell(cell => {
        fillCell.solid(cell, Color.RED_SOLID);
      });
    } else {
      sheet.lastRow.eachCell(cell => {
        fillCell.solid(cell, Color.WHITE);
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

    const systems = await System.findAll({
      attributes: [
        'productId',
        [sequelize.fn('COUNT', sequelize.col('productId')), 'productCount']
      ],
      include: [{ model: Product }],
      group: ['productId'],
      order: [[sequelize.fn('COUNT', sequelize.col('productId')), 'DESC']]
    });

    // eslint-disable-next-line no-const-assign
    // systems = systems.slice(0, 10); // test first 5 products

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
