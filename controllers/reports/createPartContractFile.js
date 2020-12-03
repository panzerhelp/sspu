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
const XCol = require('./utils/XCol');

// const systemController = require('../systemController');
const partController = require('../partController');
const contractController = require('../contractController');
// const configFilesController = require('../configFilesController');

dayjs.extend(customParseFormat);

// Cases TAB
const partCasesColumns = [
  new XCol(1, 'Date', 15, []),
  new XCol(2, 'Case Id', 15, []),
  new XCol(3, 'Customer', 40, []),
  new XCol(4, 'Response', 10, []),
  new XCol(5, 'SAID', 20, []),
  new XCol(6, 'Product', 15, []),
  new XCol(7, 'Serial', 20, []),
  new XCol(8, 'Partner', 10, []),
  new XCol(9, 'Status', 40, [])
];

const createCasesTab = async (wb, part) => {
  try {
    if (part.caseParts.length) {
      const sheet = wb.addWorksheet(`Cases (${part.caseParts.length})`, {
        views: [{ state: 'frozen', ySplit: 2 }],
        properties: { tabColor: { argb: Color.WHITE } }
      });

      addTitleRow(
        `Cases with   ${part.partNumber} ${part.description ||
          part.descriptionShort}   `,
        partCasesColumns,
        sheet
      );

      addMainRow(partCasesColumns, sheet);

      part.caseParts.forEach(casePart => {
        const case_ = casePart.case;
        const dateFormat = case_.date.length === 6 ? 'MMDDYY' : 'YYYYMMDD';
        sheet.addRow([
          dayjs(case_.date, dateFormat).format('MM/DD/YYYY'),
          case_.getCaseId(),
          case_.customer,
          case_.response,
          case_.contract,
          case_.product,
          case_.serial,
          case_.partner ? case_.partner : '',
          casePart.getStatus()
        ]);

        // eslint-disable-next-line no-unused-vars
        sheet.lastRow.eachCell((cell, colNumber) => {
          const color = casePart.isStockMiss() ? Color.RED : Color.WHITE;
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: color },
            bgColor: { argb: color }
          };
        });
      });
      setColWidth(partCasesColumns, sheet);

      sheet.autoFilter = {
        from: { row: 2, column: 1 },
        to: { row: sheet.lastRow._number, column: colNum(partCasesColumns) }
      };
    }
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

// Contracts TAB

const partContractColumns = [
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

const createContractTab = async (wb, part, contracts) => {
  try {
    if (contracts.length) {
      const sheet = wb.addWorksheet(
        `Contracts (${Object.keys(contracts).length})`,
        {
          views: [{ state: 'frozen', ySplit: 2 }],
          properties: { tabColor: { argb: Color.WHITE } }
        }
      );

      addTitleRow(
        `Contracts with part   ${part.partNumber} ${part.description ||
          part.descriptionShort}   `,
        partContractColumns,
        sheet
      );

      addMainRow(partContractColumns, sheet);
      contracts.forEach(contract => {
        contract.systems.forEach((system, index) => {
          const { product } = system;
          sheet.addRow([
            {
              text: `${contract.customer}`,
              hyperlink: `..\\customers\\${contract.customer}.xlsx`,
              tooltip: `${contract.customer} - customers\\${contract.customer}.xlsx`
            },
            contract.city,
            contract.getStockCity(),
            `'${contract.said}`,
            contract.response,
            contractStatus(contract), // status 22
            dayjs(contract.startDate, 'MMDDYY').format('MM/DD/YYYY'),
            dayjs(contract.endDate, 'MMDDYY').format('MM/DD/YYYY'),
            {
              text: product.productNumber,
              hyperlink: `..\\products\\${product.productNumber}.xlsx#Product!A1`,
              tooltip: `${product.productNumber} - products\\${product.productNumber}.xlsx`
            },
            product.description,
            system.serialList,
            system.qty
          ]);

          if (index === 0) {
            sheet.lastRow.eachCell(cell => {
              cell.border = { top: { style: 'thin' } };
            });
          }

          [1, 9].forEach(cell => {
            sheet.lastRow.getCell(cell).font = {
              color: { argb: '000000ff' },
              underline: 'single'
            };
          });
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

        if (contract.systems.length > 1) {
          for (let colNumber = 1; colNumber <= 8; colNumber++) {
            const firstRow =
              sheet.lastRow._number - (contract.systems.length - 1);
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
      });

      sheet.autoFilter = {
        from: { row: 2, column: 1 },
        to: { row: sheet.lastRow._number, column: colNum(partContractColumns) }
      };

      setColWidth(partContractColumns, sheet);
    }
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

// Main Part TAB
let id = 1;
const partColumns = [
  new XCol(id++, 'Part Number', 15, []),
  new XCol(id++, 'Description', 40, []),
  new XCol(id++, 'Field Equiv', 20, []),
  new XCol(id++, 'Price', 10, []),
  new XCol(id++, 'Posting Date', 12, []),
  new XCol(id++, 'WoH Avg', 12, []),
  new XCol(id++, 'WoH Last', 12, []),
  new XCol(id++, 'Cases', 12, []),
  new XCol(id++, 'Stock Mis', 12, []),
  new XCol(id++, 'Stock Location', 12, []),
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
  new XCol(id++, 'Expired', 10, [
    new XCol(id++, 'CTR+SD', 10, []),
    new XCol(id++, 'CTR', 10, []),
    new XCol(id++, 'SD', 10, []),
    new XCol(id++, 'ND', 10, [])
  ]) // ,
];

const PART_COL_NUM = 4; // columns which are common for the part

const setPartStatus_ = (contracts, stock) => {
  const partStat = new Status();

  contracts.forEach(contract => {
    if (stock.location === contract.getStockCity()) {
      const status = contractStatus(contract);
      const type = contractType(contract);
      partStat[status][type] += contract.systems.length;
    }
  });

  return partStat;
};

const createPartContractFile = async (stockPart, dir) => {
  try {
    const part = stockPart;
    const outFile = path.join(dir, `${part.partNumber}.xlsx`);

    const wb = new Excel.stream.xlsx.WorkbookWriter({
      filename: outFile,
      useStyles: true,
      useSharedStrings: true
    });

    const feParts = await partController.getPartFieldEquiv(part.id);
    const fePartIds = feParts.map(p => p.id);

    const contracts_ = await contractController.getContractsWithParts([
      ...fePartIds,
      part.id
    ]);

    const sheet = wb.addWorksheet('Part', {
      // views: [{ state: 'frozen', ySplit: 3 }],
      properties: { tabColor: { argb: Color.WHITE } }
    });

    addTitleRow(
      `Spare part report   ${part.partNumber} ${part.description ||
        part.descriptionShort}   `,
      partColumns,
      sheet
    );
    addMainRow(partColumns, sheet);

    sheet.lastRow.eachCell(cell => {
      cell.border = { bottom: { style: 'thin' } };
    });

    stockPart.partStatus = new Status();

    part.stocks.forEach(stock => {
      stock.partStatus = setPartStatus_(contracts_, stock);
      stockPart.partStatus.add(stock.partStatus);
    });

    part.stocks.forEach(stock => {
      // stock.partStatus = setPartStatus_(contracts_, stock);
      // stockPart.partStatus.add(stock.partStatus);

      const [wohAvg, wohLast] = stockPart.getWeeksOnHand(stock);

      const { partStatus } = stock;
      sheet.addRow([
        part.partNumber,
        part.description || part.descriptionShort,
        feParts.length ? [...feParts].map(e => e.partNumber).join(',') : '',
        part.price ? parseFloat(part.price) : '',
        stock.postDate
          ? dayjs(stock.postDate, 'MMDDYY').format('MM/DD/YYYY')
          : '',
        wohAvg, // weeks on hand avg
        wohLast, // ongoing since last case
        part.caseParts.length || 0,
        part.getStockMiss(stock.location),
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
        partStatus.expired.nd
      ]);

      // eslint-disable-next-line no-unused-vars
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
      });
    });

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

    setColWidth(partColumns, sheet);
    await createContractTab(wb, part, contracts_);
    await createCasesTab(wb, part);
    await wb.commit();

    return Promise.resolve(feParts);
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = createPartContractFile;
