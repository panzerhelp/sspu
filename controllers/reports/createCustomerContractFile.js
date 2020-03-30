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

// const Contract = require('../../models/Contract');
// const System = require('../../models/System');
// const ProductPart = require('../../models/ProductPart');
// const Serial = require('../../models/Serial');
const Product = require('../../models/Product');
const Part = require('../../models/Part');

const systemController = require('../systemController');
const partController = require('../partController');

const XCol = require('./utils/XCol');

dayjs.extend(customParseFormat);

const contractColumns = [
  new XCol(1, 'Service Agreement ID', 20, []),
  new XCol(2, 'Status', 12, []),
  new XCol(3, 'Response', 10, []),
  new XCol(4, 'Start Date', 10, []),
  new XCol(5, 'End Date', 10, []),
  new XCol(6, 'Product', 15, []),
  new XCol(7, 'Description', 40, []),
  new XCol(8, 'Qty', 10, []),
  new XCol(9, 'Serial List', 20, []),
  new XCol(10, 'Part Number', 20, []),
  new XCol(11, 'Part Description', 60, []),
  new XCol(12, 'Stock Qty', 12, []),
  new XCol(13, 'Category', 20, []),
  new XCol(14, 'Most Used', 10, []),
  new XCol(15, 'CSR', 10, []),
  new XCol(16, 'From', 25, [])
];

class PartData {
  constructor(partModel, from) {
    this.id = partModel.id;
    this.partNumber = partModel.partNumber;
    this.description = partModel.descriptionShort
      ? `${partModel.descriptionShort}`
      : `${partModel.description} `;
    this.stockQty = partModel.stockQty;
    this.category = partModel.category;
    this.mostUsed = partModel.mostUsed;
    this.csr = partModel.csr;
    this.feScanStatus = partModel.feScanStatus;
    this.from = from;
  }
}

let productPartCache = {};
let partFeCache = {};

const getContractColor = (contType, hasParts) => {
  if (contType === 'ctr') {
    return hasParts ? Color.CONTRACT_CTR : Color.CONTRACT_CTR_NO_STOCK;
  }

  if (contType === 'sd') {
    return hasParts ? Color.CONTRACT_SD : Color.CONTRACT_SD_NO_STOCK;
  }

  return hasParts ? Color.CONTRACT_ND : Color.CONTRACT_ND_NO_STOCK;
};

const getProductParts = async systems => {
  try {
    for (const system of systems) {
      if (typeof productPartCache[system.product.id] !== 'undefined') {
        system.product.parts = productPartCache[system.product.id];
      } else {
        const parts = await Part.findAll({
          include: [
            {
              model: Product,
              where: { id: system.product.id }
            }
          ]
        });

        const partMap = parts.map(p => new PartData(p, ''));
        system.product.parts = partMap;
        productPartCache[system.product.id] = partMap;
      }
    }

    return Promise.resolve(systems);
  } catch (error) {
    return Promise.reject(error);
  }
};

const groupByContract = async systems => {
  try {
    const contracts = {};

    systems = await getProductParts(systems);
    for (const system of systems) {
      if (typeof contracts[system.contract.said] === 'undefined') {
        contracts[system.contract.said] = {};
        contracts[system.contract.said].contract = system.contract;
        contracts[system.contract.said].products = [];
      }

      system.product.parts.forEach(p => {
        p.from = '_Product';
      });

      // merge product and serial parts
      if (system.serial && system.serial.parts && system.serial.parts.length) {
        for (const serialPart of system.serial.parts) {
          let found = false;
          for (const productPart of system.product.parts) {
            if (serialPart.id === productPart.id) {
              found = true;
              productPart.from += '_Serial';
              break;
            }
          }
          if (!found) {
            system.product.parts.push(new PartData(serialPart, '_Serial'));
          }
        }
      }

      system.product.parts.forEach(part => {
        if (part.stockQty > 0) {
          system.hasParts = true;
        }
      });

      for (const part of system.product.parts) {
        if (part.feScanStatus !== 'NO_FE') {
          if (typeof partFeCache[part.id] === 'undefined') {
            part.feParts = await partController.getPartFieldEquivDirect(
              part.id
            );
            partFeCache[part.id] = part.feParts;
          } else {
            part.feParts = partFeCache[part.id];
          }
          part.feParts.forEach(fePart => {
            if (fePart.stockQty > 0) {
              system.hasParts = true;
            }
          });
        } else {
          part.feParts = [];
        }
      }

      contracts[system.contract.said].products.push({
        productNumber: system.product.productNumber,
        description: system.product.description,
        parts: JSON.parse(JSON.stringify(system.product.parts)), // deep copy
        qty: system.qty,
        serialList: system.serialList || '',
        hasParts: system.hasParts
      });
    }
    return Promise.resolve(contracts);
  } catch (error) {
    return Promise.reject(error);
  }
};

const createCustomerContractFile = async (customer, dir) => {
  try {
    const outFile = path.join(dir, `${customer}.xlsx`);

    const wb = new Excel.stream.xlsx.WorkbookWriter({
      filename: outFile,
      useStyles: true,
      useSharedStrings: true
    });

    const systems = await systemController.findSystemsWithCustomer(customer);
    const contracts = await groupByContract(systems);

    const sheet = wb.addWorksheet('Contracts', {
      views: [{ state: 'frozen', ySplit: 2 }],
      properties: { tabColor: { argb: Color.WHITE } }
    });

    addTitleRow(`${customer} contracts`, contractColumns, sheet);
    addMainRow(contractColumns, sheet);

    sheet.lastRow.eachCell(cell => {
      fillCell.solid(cell, Color.SUBTITLE);
    });

    const status = new Status();
    const noStock = new Status();

    Object.keys(contracts).forEach(c => {
      const { contract } = contracts[c];

      const contStatus = contractStatus(contract);
      const contType = contractType(contract);
      status[contStatus][contType]++;

      const contractColor = getContractColor(contType, true);
      const contractRow = sheet.addRow([
        `'${contract.said}`,
        contStatus,
        contType.toUpperCase(),
        dayjs(contract.startDate, 'MMDDYY').format('DD-MMM-YYYY'),
        dayjs(contract.endDate, 'MMDDYY').format('DD-MMM-YYYY'),
        'product', // 6
        'description',
        'qty',
        'Serial List',
        '',
        '', // 11
        '',
        '',
        '',
        '',
        '' // 16
      ]);

      contractRow.eachCell((cell, colNumber) => {
        cell.border = { top: { style: 'thin' } };
        if (colNumber >= 6) {
          fillCell.solid(cell, Color.SUBTITLE);
        } else {
          fillCell.solid(cell, getContractColor(contType, true));
        }
      });

      const { products } = contracts[c];

      products.forEach(product => {
        const productColor = getContractColor(contType, product.hasParts);
        const productRow = sheet.addRow([
          `'${contract.said}`,
          contStatus,
          contType.toUpperCase(),
          dayjs(contract.startDate, 'MMDDYY').format('DD-MMM-YYYY'),
          dayjs(contract.endDate, 'MMDDYY').format('DD-MMM-YYYY'),
          product.productNumber, // 6
          product.description,
          product.qty,
          product.serialList,
          'Parts in product (SBOM)', // 10
          '', // 11
          '',
          '',
          '',
          '',
          ''
        ]);

        sheet.lastRow.eachCell((cell, colNumber) => {
          if (colNumber < 6) {
            fillCell.solid(cell, contractColor);
            cell.font = { color: { argb: contractColor } };
          } else if (colNumber < 10) {
            fillCell.solid(cell, productColor);
            cell.border = { top: { style: 'thin' } };
          } else {
            cell.font = { color: { argb: Color.WHITE } };
            fillCell.solid(cell, Color.BLACK);
            cell.border = { bottom: { style: 'thin' } };
          }
        });

        sheet.getCell(sheet.lastRow._number, 10).alignment = {
          vertical: 'middle',
          horizontal: 'center'
        };
        sheet.mergeCells(
          sheet.lastRow._number,
          10,
          sheet.lastRow._number,
          colNum(contractColumns)
        );

        let partsBom = 0;
        let partsStock = 0;

        product.parts.forEach(part => {
          partsBom++;
          if (part.stockQty > 0) partsStock++;

          sheet.addRow([
            `'${contract.said}`,
            contStatus,
            contType.toUpperCase(),
            dayjs(contract.startDate, 'MMDDYY').format('DD-MMM-YYYY'),
            dayjs(contract.endDate, 'MMDDYY').format('DD-MMM-YYYY'),
            '',
            '',
            '',
            '',
            part.partNumber,
            part.descriptionShort
              ? `${part.descriptionShort}`
              : `${part.description} `,
            part.stockQty || 0,
            part.category || '',
            part.mostUsed || '',
            part.csr || '',
            part.from || ''
          ]);

          sheet.lastRow.eachCell((cell, colNumber) => {
            if (colNumber >= 10) {
              fillCell.solid(
                cell,
                part.stockQty ? Color.PART_IN_STOCK : Color.WHITE
              );
            } else if (colNumber >= 6) {
              fillCell.solid(cell, productColor);
            } else {
              fillCell.solid(cell, contractColor);
              cell.font = { color: { argb: contractColor } };
            }
          });

          part.feParts.forEach(fePart => {
            if (fePart.stockQty > 0) partsStock++;
            sheet.addRow([
              `'${contract.said}`,
              contStatus,
              contType.toUpperCase(),
              dayjs(contract.startDate, 'MMDDYY').format('DD-MMM-YYYY'),
              dayjs(contract.endDate, 'MMDDYY').format('DD-MMM-YYYY'),
              '',
              '',
              '',
              '',
              fePart.partNumber,
              fePart.descriptionShort
                ? `${fePart.descriptionShort}`
                : `${fePart.description} `,
              fePart.stockQty || 0,
              fePart.category || '',
              fePart.mostUsed || '',
              fePart.csr || '',
              `${part.from}_FE`
            ]);

            sheet.lastRow.eachCell((cell, colNumber) => {
              if (colNumber >= 10) {
                fillCell.solid(
                  cell,
                  fePart.stockQty ? Color.PART_IN_STOCK_FE : Color.PART_FE
                );
              } else if (colNumber >= 6) {
                fillCell.solid(cell, productColor);
              } else {
                fillCell.solid(cell, contractColor);
                cell.font = { color: { argb: contractColor } };
              }
            });
          });
        });

        productRow.getCell(
          10
        ).value = `Parts   BOM: ${partsBom}  STOCK: ${partsStock}`;

        if (partsStock < 1) {
          noStock[contStatus][contType]++;
        }
      });
    });

    sheet.autoFilter = {
      from: { row: 2, column: 1 },
      to: { row: sheet.lastRow._number, column: colNum(contractColumns) }
    };

    setColWidth(contractColumns, sheet);
    productPartCache = {}; // clear cache
    partFeCache = {}; // clear cache
    await wb.commit();
    return Promise.resolve([status, noStock]);
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = createCustomerContractFile;
