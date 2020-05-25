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
const PartCache = require('./utils/PartCache');
const ProdCache = require('./utils/ProdCache');

// const systemController = require('../systemController');
// const partController = require('../partController');
const productController = require('../productController');
// const configFilesController = require('../configFilesController');

const StockMap = require('../../models/StockMap');

dayjs.extend(customParseFormat);

// Contract TAB

const productContractColumns = [
  new XCol(1, 'Customer', 40, []),
  new XCol(2, 'City', 20, []),
  new XCol(3, 'Stock City', 20, []),
  new XCol(4, 'SAID', 14, []),
  new XCol(5, 'SLA', 10, []),
  new XCol(6, 'Status', 15, []),
  new XCol(7, 'Start', 15, []),
  new XCol(8, 'End', 15, []),
  new XCol(9, 'Product', 20, []),
  new XCol(10, 'Desciption', 40, []),
  new XCol(11, 'Serials', 20, []),
  new XCol(12, 'Qty', 10, [])
];

const createContractTab = async (wb, productData) => {
  try {
    if (productData.systems.length) {
      const sheet = wb.addWorksheet(
        `Contracts (${productData.systems.length})`,
        {
          views: [{ state: 'frozen', ySplit: 2 }],
          properties: { tabColor: { argb: Color.WHITE } }
        }
      );

      addTitleRow(
        `Contracts with part   ${productData.productNumber} ${productData.description}   `,
        productContractColumns,
        sheet
      );

      addMainRow(productContractColumns, sheet);
      productData.systems.forEach(system => {
        const { contract } = system;
        // contract.systems.forEach((system, index) => {
        const product = productData;
        sheet.addRow([
          {
            text: `${contract.customer}`,
            hyperlink: `..\\customers\\${contract.customer}.xlsx`,
            tooltip: `${contract.customer} - customers\\${contract.customer}.xlsx`
          },
          contract.city,
          contract.getStockCity(),
          `'${contract.said}`,
          contract.getTypeStr(),
          contractStatus(contract), // status 22
          dayjs(contract.startDate, 'MMDDYY').format('MM/DD/YYYY'),
          dayjs(contract.endDate, 'MMDDYY').format('MM/DD/YYYY'),
          product.productNumber,
          product.description,
          system.serialList,
          system.qty
        ]);

        sheet.lastRow.getCell(1).font = {
          color: { argb: '000000ff' },
          underline: 'single'
        };

        sheet.lastRow.eachCell(cell => {
          fillCell.solid(cell, Color.WHITE);
        });
      });

      sheet.autoFilter = {
        from: { row: 2, column: 1 },
        to: {
          row: sheet.lastRow._number,
          column: colNum(productContractColumns)
        }
      };

      setColWidth(productContractColumns, sheet);
    }
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

// Main product TAB

const getPartListFromProductData = async productData => {
  try {
    const partList = productData.parts ? productData.parts : [];

    for (const part of partList) {
      part.from = '_Product';
      part.serials = [];
    }

    for (const system of productData.systems) {
      if (system.serial) {
        const serialParts = [];
        for (const part of serialParts) {
          let found = false;
          for (const p of partList) {
            if (p.id === part.id) {
              found = true;
              p.serials.push(system.serial.id);
              if (p.from.indexOf('_Serial') === -1) {
                p.from += '_Serial';
              }
              break;
            }
          }
          if (!found) {
            part.from = '_Serial';
            partList.push(part);
            part.serials = [system.serial.id];
          }
        }
      }
    }
    return Promise.resolve(partList);
  } catch (error) {
    return Promise.reject(error);
  }
};

const addPartRow = (part_, stockList, sheet, feStr) => {
  const rowValues = feStr
    ? [
        '',
        part_.stocks.length
          ? {
              text: `${part_.partNumber}`,
              hyperlink: `..\\parts\\${part_.partNumber}.xlsx`,
              tooltip: `Open spare part report - ${part_.partNumber}`
            }
          : part_.partNumber,
        part_.descriptionShort || part_.description,
        feStr ? feStr + part_.from : part_.from
      ]
    : [
        part_.stocks.length
          ? {
              text: `${part_.partNumber}`,
              hyperlink: `..\\parts\\${part_.partNumber}.xlsx`,
              tooltip: `Open spare part report - ${part_.partNumber}`
            }
          : part_.partNumber,
        part_.fePart.length ? part_.fePart.length : '',
        part_.descriptionShort || part_.description,
        feStr ? feStr + part_.from : part_.from
      ];

  if (!feStr) {
    for (const stock of stockList) {
      let found = false;
      for (const partStock of part_.stocks) {
        if (partStock.location === stock.name) {
          found = true;
          rowValues.push(partStock.qty);
          stock.qty += partStock.qty;
          break;
        }
      }

      if (!found) {
        rowValues.push('-');
      }
    }
  } else {
    const empty = new Array(stockList.length).fill('-');
    rowValues.push(...empty);
  }

  // contract columns
  rowValues.push(...['', '', '', '', '', '']);

  sheet.addRow(rowValues);

  // color parts
  sheet.lastRow.eachCell(cell => {
    let color;
    if (!feStr) {
      color = part_.stockQty ? Color.PART_IN_STOCK : Color.WHITE;
    } else {
      color = part_.stockQty ? Color.PART_IN_STOCK_FE : Color.PART_FE;
    }
    fillCell.solid(cell, color);
  });

  // mark part source GRAY
  sheet.lastRow.getCell(4).font = {
    color: { argb: '55555555' }
  };

  if (part_.stocks.length) {
    const cellNum = feStr ? 2 : 1;
    sheet.lastRow.getCell(cellNum).font = {
      color: { argb: '000000ff' },
      underline: 'single'
    };
  }
};

const addContractData = (productData, stockList, sheet) => {
  const prodStatus = {};

  const colors = {
    ctr: Color.CONTRACT_CTR,
    sd: Color.CONTRACT_SD,
    nd: Color.CONTRACT_ND
  };

  const colorsNoStock = {
    ctr: Color.CONTRACT_CTR_NO_STOCK,
    sd: Color.CONTRACT_SD_NO_STOCK,
    nd: Color.CONTRACT_ND_NO_STOCK
  };

  stockList.forEach(stock => {
    prodStatus[stock.name] = new Status();
  });

  productData.systems.forEach(system => {
    const { contract } = system;
    const rowValues = ['', '', '', '']; // parts

    // contrat status in the stock
    const status = contractStatus(contract);
    const type = contractType(contract);

    const contractCityStock = contract.getStockCity();
    if (typeof prodStatus[contractCityStock] !== 'undefined') {
      prodStatus[contractCityStock][status][type]++;
    }
    let cityStockId;
    let noStock = true;
    stockList.forEach((stock, index) => {
      if (contractCityStock === stock.name) {
        rowValues.push(`${contract.getTypeStr()} ${status}`);
        cityStockId = index;
        if (stock.qty > 0) {
          noStock = false;
        }
      } else {
        rowValues.push('');
      }
    });

    const serialLink = system.serial
      ? {
          text: `${system.serialList}`,
          hyperlink: `https://partsurfer.hpe.com/Search.aspx?SearchText=${system.serial.serialNum}`,
          tooltip: `Search HPE Partsurfer for the serial ${system.serial.serialNum}`
        }
      : '';

    rowValues.push(
      ...[
        {
          text: `${contract.customer}`,
          hyperlink: `..\\customers\\${contract.customer}.xlsx`,
          tooltip: `${contract.customer} - customers\\${contract.customer}.xlsx`
        },
        contract.city,
        `'${contract.said}`,
        dayjs(contract.startDate, 'MMDDYY').format('MM/DD/YYYY'),
        dayjs(contract.endDate, 'MMDDYY').format('MM/DD/YYYY'),
        serialLink,
        system.qty
      ]
    );

    sheet.addRow(rowValues);

    if (serialLink) {
      sheet.lastRow.getCell(10 + stockList.length).font = {
        color: { argb: '000000ff' },
        underline: 'single'
      };
    }

    sheet.lastRow.getCell(5 + stockList.length).font = {
      color: { argb: '000000ff' },
      underline: 'single'
    };

    sheet.lastRow.eachCell((cell, colNumber) => {
      if (colNumber <= 4) {
        fillCell.solid(cell, Color.SUBTITLE);
      } else if (colNumber < 5 + stockList.length) {
        if (colNumber === 5 + cityStockId) {
          fillCell.solid(cell, noStock ? colorsNoStock[type] : colors[type]);
        } else {
          fillCell.solid(cell, Color.WHITE);
        }

        cell.border = { bottom: { style: 'thin' } };
      } else {
        if (contractCityStock === 'IGNORE') {
          fillCell.solid(cell, Color.GREY);
        } else {
          fillCell.solid(cell, noStock ? colorsNoStock[type] : colors[type]);
        }
        cell.border = { bottom: { style: 'thin' } };
      }
    });
  });

  return prodStatus;
};

const addStockColumns = (productColumns, startId) => {
  const stockList = StockMap.getCurrentStocks().map(stockName => {
    return { name: stockName, qty: 0 };
  });
  stockList.forEach(stock => {
    productColumns.push(new XCol(startId++, stock.name, 12, []));
  });

  return stockList;
};

const addContractColumns = (productColumns, startId) => {
  productColumns.push(new XCol(startId++, 'Customer', 40, []));
  productColumns.push(new XCol(startId++, 'City', 15, []));
  productColumns.push(new XCol(startId++, 'SAID', 15, []));
  productColumns.push(new XCol(startId++, 'Start', 15, []));
  productColumns.push(new XCol(startId++, 'End', 15, []));
  productColumns.push(new XCol(startId++, 'Serials', 15, []));
  productColumns.push(new XCol(startId++, 'Qty', 10, []));
};

const createProductContractFile = async (product, dir) => {
  try {
    const outFile = path.join(dir, `${product.productNumber}.xlsx`);
    const wb = new Excel.stream.xlsx.WorkbookWriter({
      filename: outFile,
      useStyles: true,
      useSharedStrings: true
    });

    const productData = await productController.getProductDataById(product.id);

    if (!productData) {
      ProdCache.addProduct(product.id, []);
      return Promise.resolve([null, 0, 0]);
    }

    const partList_ = await getPartListFromProductData(productData);

    const sheet = wb.addWorksheet('Product', {
      views: [{ state: 'frozen', ySplit: 2 }],
      properties: { tabColor: { argb: Color.WHITE } }
    });

    const productColumns = [
      new XCol(1, 'Part Number', 16, []),
      new XCol(2, 'Field Equiv', 16, []),
      new XCol(3, 'Part Description', 50, []),
      new XCol(4, 'Source', 20, []) // ,
    ];

    const stockList = addStockColumns(productColumns, 5);
    addContractColumns(productColumns, 5 + stockList.length);

    addTitleRow(
      `${product.productNumber}  ${product.description}`,
      productColumns,
      sheet
    );
    addMainRow(productColumns, sheet);

    sheet.lastRow.eachCell(cell => {
      fillCell.solid(cell, Color.SUBTITLE);
    });

    const startRow = sheet.lastRow._number + 1;
    const feParts = new Set();

    const addLine = () => {
      sheet.lastRow.eachCell((cell, colNumber) => {
        if (colNumber < 5 + stockList.length) {
          cell.border = { bottom: { style: 'thin' } };
        } else {
          fillCell.solid(cell, Color.SUBTITLE);
        }
      });
    };

    for (const part of partList_) {
      const part_ = await PartCache.getPart(part.id); // partsCache[part.id];
      part_.from = part.from;
      addPartRow(part_, stockList, sheet);
      for (const fePart_ of part_.fePart) {
        feParts.add(fePart_);
        fePart_.from = part.from;
        addPartRow(fePart_, stockList, sheet, '_FE');
      }

      addLine();
    }

    for (const fePart of feParts) {
      let found = false;
      for (const part of partList_) {
        if (part.id === fePart.id) {
          found = true;
          break;
        }
      }

      if (!found) {
        fePart.fePart = [];
        fePart.from = '_FE_ADDED';
        partList_.push(fePart);
        addPartRow(fePart, stockList, sheet);
        addLine();
      }
    }

    // merge upper area above contract list
    sheet.mergeCells(
      startRow,
      5 + stockList.length,
      sheet.lastRow._number,
      colNum(productColumns)
    );

    const prodStatus = addContractData(productData, stockList, sheet);

    sheet.autoFilter = {
      from: { row: 2, column: 1 },
      to: { row: sheet.lastRow._number, column: colNum(productColumns) }
    };

    setColWidth(productColumns, sheet);
    await createContractTab(wb, productData);
    await wb.commit();

    stockList.forEach(stock => {
      stock.prodStatus = prodStatus[stock.name];
    });

    ProdCache.addProduct(product.id, partList_);
    return Promise.resolve([stockList, partList_.length]);
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = createProductContractFile;
