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

const systemController = require('../systemController');
const partController = require('../partController');

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
        sheet.addRow([
          dayjs(case_.date, 'YYYYMMDD').format('MM/DD/YYYY'),
          case_.getCaseId(),
          case_.customer,
          case_.response,
          case_.contract,
          case_.product,
          case_.serial,
          case_.partner,
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

// Contract TAB

const partContractColumns = [
  new XCol(1, 'Customer', 40, []),
  new XCol(2, 'SAID', 14, []),
  new XCol(3, 'SLA', 10, []),
  new XCol(4, 'Status', 15, []),
  new XCol(5, 'Start', 15, []),
  new XCol(6, 'End', 15, []),
  new XCol(7, 'Serials', 15, []),
  new XCol(8, 'Product', 14, []),
  new XCol(9, 'Desciption', 30, []),
  new XCol(10, 'Qty', 10, []),
  new XCol(11, 'FE', 10, [])
];

const createContractTab = async (wb, part, contracts) => {
  try {
    if (Object.keys(contracts).length) {
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

      Object.keys(contracts).forEach(said => {
        Object.keys(contracts[said]).forEach(product => {
          const s = contracts[said][product].systems;
          let parts;
          if (s[0].parts) {
            parts = s[0].parts.map(p => p.partNumber);
          } else if (s[0].product.parts) {
            parts = s[0].product.parts.map(p => p.partNumber);
          }

          sheet.addRow([
            {
              text: `${s[0].contract.customer} - ${s[0].contract.city}`,
              hyperlink: `..\\customers\\${s[0].contract.customer}.xlsx`,
              tooltip: `${s[0].contract.customer} - customers\\${s[0].contract.customer}.xlsx`
            },

            `'${s[0].contract.said}`,
            s[0].contract.response,
            contractStatus(s[0].contract), // status 22
            dayjs(s[0].contract.startDate, 'MMDDYY').format('MM/DD/YYYY'),
            dayjs(s[0].contract.endDate, 'MMDDYY').format('MM/DD/YYYY'),
            contracts[said][product].serials.join(','),

            {
              text: product,
              hyperlink: `..\\products\\${product}.xlsx`,
              tooltip: `${product} - products\\${product}.xlsx`
            },

            s[0].product.description,
            contracts[said][product].serials.length,
            parts ? parts.join(',') : ''
          ]);

          [1, 8].forEach(cell => {
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

const partColumns = [
  new XCol(1, 'Part Number', 15, []),
  new XCol(2, 'Description', 40, []),
  new XCol(3, 'Qty', 5, []),
  new XCol(4, 'Cases', 10, []),
  new XCol(5, 'Stock Mis', 10, []),
  new XCol(6, 'Price', 10, []),
  new XCol(7, 'Field Equiv', 20, []),
  new XCol(8, 'Active', 8, [
    new XCol(8, 'CTR+SD', 8, []),
    new XCol(9, 'CTR', 8, []),
    new XCol(10, 'SD', 8, []),
    new XCol(11, 'ND', 8, [])
  ]),
  new XCol(12, 'Active 6m', 8, [
    new XCol(12, 'CTR+SD', 8, []),
    new XCol(13, 'CTR', 8, []),
    new XCol(14, 'SD', 8, []),
    new XCol(15, 'ND', 8, [])
  ]),
  new XCol(16, 'Expired', 8, [
    new XCol(16, 'CTR+SD', 8, []),
    new XCol(17, 'CTR', 8, []),
    new XCol(18, 'SD', 8, []),
    new XCol(19, 'ND', 8, [])
  ])
];

const setPartStatus = contracts => {
  const partStat = new Status();
  Object.keys(contracts).forEach(said => {
    Object.keys(contracts[said]).forEach(product => {
      const { contract } = contracts[said][product].systems[0];
      const status = contractStatus(contract);
      const type = contractType(contract);
      partStat[status][type] += contracts[said][product].systems.length;
    });
  });

  return partStat;
};

const groupSystemsByContracts = systems => {
  const contracts = {};

  systems.sort((a, b) => {
    const compare = a.contract.response.localeCompare(b.contract.response);
    if (compare === 0) {
      return a.contract.customer.localeCompare(b.contract.customer);
    }

    return compare;
  });

  systems.forEach(system => {
    if (typeof contracts[system.contract.said] === 'undefined') {
      contracts[system.contract.said] = {};
    }

    if (
      typeof contracts[system.contract.said][system.product.productNumber] ===
      'undefined'
    ) {
      contracts[system.contract.said][system.product.productNumber] = {};

      contracts[system.contract.said][
        system.product.productNumber
      ].systems = [];

      contracts[system.contract.said][
        system.product.productNumber
      ].serials = [];
    }
    contracts[system.contract.said][system.product.productNumber].systems.push(
      system
    );

    if (system.serialList.length) {
      contracts[system.contract.said][
        system.product.productNumber
      ].serials.push(system.serialList);
    }
  });
  return contracts;
};

const createPartContractFile = async (part, dir) => {
  try {
    const outFile = path.join(dir, `${part.partNumber}.xlsx`);

    const wb = new Excel.stream.xlsx.WorkbookWriter({
      filename: outFile,
      useStyles: true,
      useSharedStrings: true
    });

    const feParts = await partController.getPartFieldEquiv(part.id);
    const fePartIds = feParts.map(p => p.id);
    const systems = await systemController.findSystemsWithPart([
      ...fePartIds,
      part.id
    ]);

    const contracts = groupSystemsByContracts(systems);
    const partStatus = setPartStatus(contracts);

    const sheet = wb.addWorksheet('Part', {
      views: [{ state: 'frozen', ySplit: 3 }],
      properties: { tabColor: { argb: Color.WHITE } }
    });

    addTitleRow(
      `Spare part report   ${part.partNumber} ${part.description ||
        part.descriptionShort}   `,
      partColumns,
      sheet
    );
    addMainRow(partColumns, sheet);

    await sheet.addRow([
      part.partNumber,
      part.description || part.descriptionShort,
      parseInt(part.stockQty, 10),
      part.caseParts.length || 0,
      part.getStockMiss(),
      part.price ? parseFloat(part.price) : '',
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
      partStatus.expired.nd
    ]);

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

    setColWidth(partColumns, sheet);
    await createContractTab(wb, part, contracts);
    await createCasesTab(wb, part);
    await wb.commit();

    return Promise.resolve([partStatus, feParts]);
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = createPartContractFile;
