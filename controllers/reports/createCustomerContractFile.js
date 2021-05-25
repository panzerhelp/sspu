/* eslint-disable no-loop-func */
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
// const systemController = require('../systemController');
const contractController = require('../contractController');
const configFilesController = require('../configFilesController');
const partController = require('../partController');
const XCol = require('./utils/XCol');

const ProdCache = require('./utils/ProdCache');
const PartCache = require('./utils/PartCache');

dayjs.extend(customParseFormat);

const getContractColor = (contType, hasParts) => {
  if (contType === 'ctr') {
    return hasParts ? Color.CONTRACT_CTR : Color.CONTRACT_CTR_NO_STOCK;
  }

  if (contType === 'sd') {
    return hasParts ? Color.CONTRACT_SD : Color.CONTRACT_SD_NO_STOCK;
  }

  return hasParts ? Color.CONTRACT_ND : Color.CONTRACT_ND_NO_STOCK;
};

const getSystemStockData = (system, stockCity) => {
  const product = ProdCache.getProduct(system.productId);
  let partsBom = 0;
  let partsStock = 0;

  if (product) {
    for (const part of product) {
      if (part.from !== '_Serial' || part.serials.indexOf(system.id) !== -1) {
        if (part.stocks) {
          partsStock += part.stockCityQty(stockCity);
        } else {
          partsStock += PartCache.parts[part.id].stockCityQty(stockCity);
        }
      }
    }

    partsBom = product.length;
  }

  return [partsBom, partsStock];
};

const makeSystemPartList = async system => {
  try {
    const partList = [];

    const product = ProdCache.getProduct(system.product.id);
    if (product) {
      const partsFromProduct = product.map(part => {
        if (part.stocks) {
          return part;
        }
        return PartCache.parts[part.id];
      });

      const partsFromSerial = system.serial ? system.serial.parts : [];

      const feParts = new Set();
      for (const partSerial of partsFromSerial) {
        let found = false;
        for (const partProd of partsFromProduct) {
          if (partSerial.id === partProd.id) {
            found = true;
            partProd.from = '_Product_Serial';
            break;
          }
        }

        if (!found) {
          const part_ = await PartCache.getPart(partSerial.id);
          part_.from = '_Serial';
          partList.push(part_);

          for (const fePart of part_.fePart) {
            feParts.add(fePart);
          }
        }
      }

      for (const fePart of feParts) {
        let found = false;
        for (const partProd of partsFromProduct) {
          if (fePart.id === partProd.id) {
            found = true;
            break;
          }
        }

        if (!found) {
          fePart.from = '_FE_ADDED_Serial';
          partList.push(fePart);
        }
      }

      return Promise.resolve([...partsFromProduct, ...partList]);
    }

    return Promise.resolve(partList);
  } catch (error) {
    return Promise.reject(error);
  }
};

const addBomPartRows = async (sheet, system, product, rowValues, stockCity) => {
  try {
    let rowsAdded = 0;

    if (product && product.length) {
      const partList = await makeSystemPartList(system);
      for (const part of partList) {
        rowsAdded++;
        const partLink = part.stocks.length
          ? {
              text: `${part.partNumber}`,
              hyperlink: `..\\parts\\${part.partNumber}.xlsx`,
              tooltip: `Open spare part report - ${part.partNumber}`
            }
          : part.partNumber;

        const partValues = [
          ...rowValues,
          ...[
            partLink,
            part.fePart ? part.fePart.length : 0,
            part.description || part.descriptionShort,
            part.from,
            part.stockCityQty(stockCity)
          ]
        ];

        sheet.addRow(partValues);

        // color parts
        sheet.lastRow.eachCell((cell, cellNumber) => {
          if (cellNumber > rowValues.length) {
            const color = part.stockCityQty(stockCity)
              ? Color.PART_IN_STOCK
              : Color.WHITE;

            fillCell.solid(cell, color);
          }
        });

        // mark part source GRAY
        sheet.lastRow.getCell(rowValues.length + 4).font = {
          color: { argb: '55555555' }
        };

        if (part.stocks.length) {
          const cellNum = 1 + rowValues.length;
          sheet.lastRow.getCell(cellNum).font = {
            color: { argb: '000000ff' },
            underline: 'single'
          };
        }
      }
    } else {
      rowValues.push(...['', '', '', '', '']);
      sheet.addRow(rowValues);
    }
    return Promise.resolve(rowsAdded);
  } catch (error) {
    return Promise.reject(error);
  }
};

const addContractsSystemRows = async (sheet, contract, addPartRows) => {
  try {
    const status = new Status();
    const noStock = new Status();

    const stockCity = contract.getStockCity();
    const contStatus = contractStatus(contract);
    const contType = contractType(contract);
    status[contStatus][contType] += contract.systems.length;
    const { customer, said } = contract;

    const contractLink = addPartRows
      ? `'${said}`
      : {
          text: `${said}`,
          hyperlink: `..\\contracts\\${customer}_${said}.xlsx`,
          tooltip: `Open contract detailed report`
        };

    const contractValues = [
      contractLink,
      contract.city,
      stockCity,
      contract.response,
      contractStatus(contract), // status 22
      dayjs(contract.startDate, 'MMDDYY').format('MM/DD/YYYY'),
      dayjs(contract.endDate, 'MMDDYY').format('MM/DD/YYYY')
    ];

    let systemsNoStock = 0;
    let partRows = 0;
    for (const system of contract.systems) {
      const [partsBom, partsStock] = getSystemStockData(system, stockCity);

      if (system.serial && !system.serial.parts) {
        system.serial.parts = await partController.getSerialParts(
          system.serial.id
        );
      }

      const serialLink =
        system.serial && system.serial.parts.length
          ? {
              text: `${system.serialList}`,
              hyperlink: `https://partsurfer.hpe.com/Search.aspx?SearchText=${system.serial.serialNum}`,
              tooltip: `Search HPE Partsurfer for the serial ${system.serial.serialNum}`
            }
          : system.serialList;

      if (partsStock < 1) {
        systemsNoStock++;
      }

      if (partsBom > 0 && partsStock < 1) {
        noStock[contStatus][contType]++;
      }

      const productLink =
        partsBom > 0
          ? {
              text: system.product.productNumber,
              hyperlink: `..\\products\\${system.product.productNumber}.xlsx`,
              tooltip: `${system.product.productNumber}`
            }
          : system.product.productNumber;

      const rowValues = [
        ...contractValues,
        ...[
          productLink,
          system.product.description,
          serialLink,
          system.qty,
          partsBom,
          system.serial ? system.serial.parts.length : '-',
          partsStock
        ]
      ];

      let rowsAdded = 0;
      const product = ProdCache.getProduct(system.product.id);
      if (addPartRows) {
        rowsAdded += await addBomPartRows(
          sheet,
          system,
          product,
          rowValues,
          stockCity
        );
      } else {
        sheet.addRow(rowValues);

        sheet.lastRow.getCell(1).font = {
          color: { argb: '000000ff' },
          underline: 'single'
        };
      }

      // merge products
      if (rowsAdded > 1) {
        for (let colNumber = 8; colNumber <= 14; colNumber++) {
          const firstRow = sheet.lastRow._number - (rowsAdded - 1);
          sheet.mergeCells(
            firstRow,
            colNumber,
            sheet.lastRow._number,
            colNumber
          );

          sheet.getCell(firstRow, colNumber).alignment = {
            vertical: 'top',
            horizontal: colNumber < 10 ? 'left' : 'right'
          };
        }
      }

      if (addPartRows) {
        sheet.lastRow.eachCell((cell, colNumber) => {
          if (colNumber >= 8) {
            cell.border = { bottom: { style: 'thin' } };
          }
          fillCell.solid(cell, Color.WHITE);
        });
      }

      partRows += rowsAdded > 1 ? rowsAdded - 1 : 0;

      if (partsBom) {
        sheet.lastRow.getCell(8).font = {
          color: { argb: '000000ff' },
          underline: 'single'
        };
      }

      if (typeof serialLink === 'object') {
        sheet.lastRow.getCell(10).font = {
          color: { argb: '000000ff' },
          underline: 'single'
        };
      }

      sheet.lastRow.eachCell((cell, colNumber) => {
        if (colNumber >= 8 && colNumber <= 14) {
          const color = getContractColor(contType, partsStock > 0);
          fillCell.solid(cell, color);
        } else {
          fillCell.solid(cell, Color.WHITE);
        }
      });
    }

    // merge contracts
    const firstRow =
      sheet.lastRow._number - (contract.systems.length + partRows - 1);
    const contrColor = getContractColor(contType, systemsNoStock < 1);

    if (addPartRows) {
      if (contract.systems.length + partRows > 1) {
        for (let colNumber = 1; colNumber <= 7; colNumber++) {
          sheet.mergeCells(
            firstRow,
            colNumber,
            sheet.lastRow._number,
            colNumber
          );

          sheet.getCell(firstRow, colNumber).alignment = {
            vertical: 'top',
            horizontal: 'left'
          };
        }
      }

      for (let colNumber = 1; colNumber <= 7; colNumber++) {
        fillCell.solid(sheet.getCell(firstRow, colNumber), contrColor);
      }

      // color contract entries
    } else {
      for (let row = firstRow; row <= sheet.lastRow._number; ++row) {
        for (let colNumber = 1; colNumber <= 7; colNumber++) {
          const cell = sheet.getCell(row, colNumber);
          if (row === firstRow) {
            if (colNumber === 1) {
              cell.font = {
                color: { argb: '000000ff' },
                underline: 'single'
              };
            }
          } else {
            cell.font = {
              color: { argb: contrColor }
            };
          }

          fillCell.solid(cell, contrColor);
        }
      }
    }

    sheet.lastRow.eachCell(cell => {
      cell.border = { bottom: { style: 'thin' } };
    });

    return Promise.resolve([status, noStock]);
  } catch (error) {
    return Promise.reject(error);
  }
};

const contractColumns = [
  new XCol(1, 'SAID', 14, []),
  new XCol(2, 'City', 20, []),
  new XCol(3, 'Stock City', 20, []),
  new XCol(4, 'Response', 10, []),
  new XCol(5, 'Status', 15, []),
  new XCol(6, 'Start', 15, []),
  new XCol(7, 'End', 15, []),
  new XCol(8, 'Product', 20, []),
  new XCol(9, 'Desciption', 40, []),
  new XCol(10, 'Serials', 20, []),
  new XCol(11, 'Qty', 10, []),
  new XCol(12, 'Parts (Product)', 15, []),
  new XCol(13, 'Parts (Serial)', 15, []),
  new XCol(14, 'Parts Stock', 10, [])
];

// ****************************************************************
// customer - contract file with all systems - part table
//

const replaceIllegalChars = name => {
  return name.replace(/[/\\?%*:|"<>]/g, '-');
};

const createExcelContractFile = contract => {
  const { said, customer } = contract;
  const dir = path.join(configFilesController.getReportDir(), 'contracts');
  const outFile = path.join(
    dir,
    `${replaceIllegalChars(customer)}_${said}.xlsx`
  );

  const wb = new Excel.stream.xlsx.WorkbookWriter({
    filename: outFile,
    useStyles: true,
    useSharedStrings: true
  });

  return wb;
};

const createContractFile = async contract => {
  try {
    const wb = createExcelContractFile(contract);
    const { said, customer } = contract;

    const sheet = wb.addWorksheet('Contract Parts', {
      views: [{ state: 'frozen', ySplit: 2 }],
      properties: { tabColor: { argb: Color.WHITE } }
    });

    let colId = contractColumns.length + 1;
    const xColumns = [
      ...contractColumns,
      ...[
        new XCol(colId++, 'Part Number', 16, []),
        new XCol(colId++, 'Field Equiv', 16, []),
        new XCol(colId++, 'Part Description', 50, []),
        new XCol(colId++, 'Source', 20, []),
        new XCol(colId++, 'Stock Qty', 15, [])
      ]
    ];

    addTitleRow(`Contract ${said} (${customer})`, xColumns, sheet);
    addMainRow(xColumns, sheet);
    const [status, noStock] = await addContractsSystemRows(
      sheet,
      contract,
      true
    );

    sheet.autoFilter = {
      from: { row: 2, column: 1 },
      to: { row: sheet.lastRow._number, column: colNum(xColumns) }
    };

    setColWidth(xColumns, sheet);
    await wb.commit();
    return Promise.resolve([status, noStock]);
  } catch (error) {
    return Promise.reject(error);
  }
};

// **********************************************************************

const createCustomerContractFile = async (customer, dir, custFileName) => {
  try {
    const status = new Status();
    const noStock = new Status();

    const outFile = path.join(dir, `${custFileName}.xlsx`);

    const wb = new Excel.stream.xlsx.WorkbookWriter({
      filename: outFile,
      useStyles: true,
      useSharedStrings: true
    });

    const sheet = wb.addWorksheet('Contracts', {
      views: [{ state: 'frozen', ySplit: 2 }],
      properties: { tabColor: { argb: Color.WHITE } }
    });

    addTitleRow(`${customer} contracts`, contractColumns, sheet);
    addMainRow(contractColumns, sheet);

    sheet.lastRow.eachCell(cell => {
      fillCell.solid(cell, Color.SUBTITLE);
    });

    const contracts = await contractController.getContractsWithCutomer(
      customer
    );

    for (const contract of contracts) {
      const [status_, nostock_] = await addContractsSystemRows(sheet, contract);
      status.add(status_);
      noStock.add(nostock_);

      await createContractFile(contract);
    }

    sheet.autoFilter = {
      from: { row: 2, column: 1 },
      to: { row: sheet.lastRow._number, column: colNum(contractColumns) }
    };

    setColWidth(contractColumns, sheet);
    await wb.commit();
    return Promise.resolve([status, noStock]);
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = createCustomerContractFile;
