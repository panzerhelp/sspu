/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const path = require('path');
const Excel = require('exceljs');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

const addTitleRow = require('./utils/addTitleRow');
const addMainRow = require('./utils/addMainRow');
const setColWidth = require('./utils/setColWidth');
const contractType = require('./utils/contractType');
const contractStatus = require('./utils/contractStatus');
const Status = require('./utils/Status');
const colNum = require('./utils/colNum');
const Color = require('./utils/Color');
const fillCell = require('./utils/fillCell');

const XCol = require('./utils/XCol');

const systemController = require('../systemController');
const partController = require('../partController');

const Product = require('../../models/Product');
const Part = require('../../models/Part');

dayjs.extend(customParseFormat);

const productColumns = [
  new XCol(1, 'Part Number', 20, []),
  new XCol(2, 'Part Description', 60, []),
  new XCol(3, 'Stock qty', 15, []),
  new XCol(4, 'Source', 15, []),
  new XCol(5, 'SAID', 20, []),
  new XCol(6, 'Customer', 30, []),
  new XCol(7, 'Response', 10, []),
  new XCol(8, 'Status', 10, []),
  new XCol(9, 'Start Date', 15, []),
  new XCol(10, 'End Date', 15, []),
  new XCol(11, 'Qty', 10, []),
  new XCol(12, 'Serials', 20, [])
];

const getPartList = async systems => {
  try {
    const product = await Product.findOne({
      where: { id: systems[0].productId },
      include: [{ model: Part, required: true }]
    });

    const partList = product && product.parts ? product.parts : [];

    for (const part of partList) {
      part.from = '_Product';
    }

    for (const system of systems) {
      if (system.serial) {
        for (const part of system.serial.parts) {
          let found = false;
          for (const p of partList) {
            if (p.id === part.id) {
              found = true;
              if (p.from.indexOf('_Serial') === -1) {
                p.from += '_Serial';
              }
              break;
            }
          }
          if (!found) {
            part.from = '_Serial';
            partList.push(part);
          }
        }
      }
    }

    for (const part of partList) {
      if (part.feScanStatus !== 'NO_FE') {
        part.feParts = await partController.getPartFieldEquivDirect(part.id);
      } else {
        part.feParts = [];
      }
    }

    return Promise.resolve(partList);
  } catch (error) {
    return Promise.reject(error);
  }
};

const createProductContractFile = async (product, dir) => {
  try {
    const outFile = path.join(dir, `${product.productNumber}.xlsx`);

    const wb = new Excel.stream.xlsx.WorkbookWriter({
      filename: outFile,
      useStyles: true,
      useSharedStrings: true
    });

    const systems = await systemController.findSystemsWithProductId(product.id);

    const sheet = wb.addWorksheet('Product', {
      views: [{ state: 'frozen', ySplit: 2 }],
      properties: { tabColor: { argb: Color.WHITE } }
    });

    addTitleRow(
      `${product.productNumber}  ${product.description}`,
      productColumns,
      sheet
    );
    addMainRow(productColumns, sheet);

    sheet.lastRow.eachCell(cell => {
      fillCell.solid(cell, Color.SUBTITLE);
    });

    const status = new Status();
    // sheet.addRow([product.productNumber, product.description, '', '', '']);

    const contracts = systems.map(system => {
      return {
        said: system.contract.said,
        customer: system.contract.customer,
        type: contractType(system.contract),
        status: contractStatus(system.contract),
        startDate: dayjs(system.contract.startDate, 'MMDDYY').format(
          'DD-MMM-YYYY'
        ),
        endDate: dayjs(system.contract.endDate, 'MMDDYY').format('DD-MMM-YYYY'),
        qty: system.qty,
        serialList: system.serialList
      };
    });

    const responseOrder = ['ctr', 'sd', 'nd'];
    const statusOrder = ['active', 'active6m', 'expired'];

    contracts.sort((c1, c2) => {
      if (
        statusOrder.indexOf(c1.status) === statusOrder.indexOf(c2.status) &&
        responseOrder.indexOf(c1.type) === responseOrder.indexOf(c2.type)
      ) {
        return c1.customer.localeCompare(c2.customer);
      }
      if (statusOrder.indexOf(c1.status) === statusOrder.indexOf(c2.status)) {
        return responseOrder.indexOf(c1.type) - responseOrder.indexOf(c2.type);
      }
      return statusOrder.indexOf(c1.status) - statusOrder.indexOf(c2.status);
    });

    let dataRowNum = sheet.lastRow._number + 1;
    contracts.forEach(c => {
      status[c.status][c.type] += c.qty;
      sheet.addRow([
        '',
        '',
        '',
        '',
        `'${c.said}`,
        c.customer,
        c.type,
        c.status.toUpperCase(),
        c.startDate,
        c.endDate,
        c.qty,
        c.serialList
      ]);
    });

    const partList = await getPartList(systems);
    const partsBom = partList.length;
    let partsStock = 0;

    for (const part of partList) {
      for (let i = 1; i < 5; ++i) {
        const cell = sheet.getCell(dataRowNum, i);
        cell.border = { top: { style: 'dotted' } };
        fillCell.solid(cell, part.stockQty ? Color.PART_IN_STOCK : Color.WHITE);
      }

      sheet.getCell(dataRowNum, 1).value = part.partNumber;
      sheet.getCell(dataRowNum, 2).value =
        part.descriptionShort || part.description;
      sheet.getCell(dataRowNum, 3).value = part.stockQty;
      sheet.getCell(dataRowNum, 4).value = part.from;
      dataRowNum++;

      if (part.stockQty) {
        partsStock += part.stockQty;
      }

      for (const fePart of part.feParts) {
        for (let i = 1; i < 5; ++i) {
          const cell = sheet.getCell(dataRowNum, i);

          fillCell.solid(
            cell,
            fePart.stockQty ? Color.PART_IN_STOCK_FE : Color.PART_FE
          );
        }

        sheet.getCell(dataRowNum, 1).value = fePart.partNumber;
        sheet.getCell(dataRowNum, 2).value =
          fePart.descriptionShort || fePart.description;
        sheet.getCell(dataRowNum, 3).value = fePart.stockQty;
        sheet.getCell(dataRowNum, 4).value = `${part.from}_FE`;
        dataRowNum++;

        if (fePart.stockQty) {
          partsStock += fePart.stockQty;
        }
      }
    }

    // partList.forEach(part => {
    //   sheet.addRow([
    //     '',
    //     '',
    //     '',
    //     '',
    //     '',
    //     '',
    //     '',
    //     '',
    //     part.partNumber,
    //     part.descriptionShort || part.description,
    //     part.stockQty,
    //     part.from
    //   ]);

    //   if (part.stockQty) {
    //     partsStock += part.stockQty;
    //   }

    //   part.feParts.forEach(fePart => {
    //     sheet.addRow([
    //       '',
    //       '',
    //       '',
    //       '',
    //       '',
    //       '',
    //       '',
    //       '',
    //       fePart.partNumber,
    //       fePart.descriptionShort || fePart.description,
    //       fePart.stockQty,
    //       '_Field_Equiv'
    //     ]);

    //     if (fePart.stockQty) {
    //       partsStock += fePart.stockQty;
    //     }
    //   });
    // });
    // systems.forEach(system => {
    //   sheet.addRow([
    //     `'${system.contract.said}`,
    //     system.contract.customer,
    //     contractType(system.contract).toUpperCase(),
    //     contractStatus(system.contract),
    //     dayjs(system.contract.startDate, 'MMDDYY').format('DD-MMM-YYYY'),
    //     dayjs(system.contract.endDate, 'MMDDYY').format('DD-MMM-YYYY')
    //   ]);
    // });

    sheet.autoFilter = {
      from: { row: 2, column: 1 },
      to: { row: sheet.lastRow._number, column: colNum(productColumns) }
    };

    setColWidth(productColumns, sheet);
    // productPartCache = {}; // clear cache
    // partFeCache = {}; // clear cache
    await wb.commit();

    return Promise.resolve([status, partsBom, partsStock]);
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = createProductContractFile;
