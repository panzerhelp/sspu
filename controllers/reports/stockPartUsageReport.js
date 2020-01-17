/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
const { ipcRenderer } = require('electron');
const Excel = require('exceljs');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');

// const Status = require('./utils/Status');
const checkFileBusy = require('./utils/checkFileBusy');
const addTitleRow = require('./utils/addTitleRow');
const addMainRow = require('./utils/addMainRow');
const setColWidth = require('./utils/setColWidth');
// const contractType = require('./utils/contractType');
// const contractStatus = require('./utils/contractStatus');
const colNum = require('./utils/colNum');

const configFilesController = require('../configFilesController');
// const partController = require('../partController');
// const systemController = require('../systemController');

const Part = require('../../models/Part');
const Stock = require('../../models/Stock');
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
  // new XCol(19, 'Customer', 40, []),
  // new XCol(20, 'SAID', 14, []),
  // new XCol(21, 'SLA', 10, []),
  // new XCol(22, 'Status', 15, []),
  // new XCol(23, 'Start', 15, []),
  // new XCol(24, 'End', 15, []),
  // new XCol(25, 'Serials', 15, []),
  // new XCol(26, 'Product', 14, []),
  // new XCol(27, 'Desciption', 20, []),
  // new XCol(28, 'Qty', 10, []),
  // new XCol(29, 'FE', 10, [])
];

// const setPartStatus = contracts => {
//   const partStat = new Status();
//   Object.keys(contracts).forEach(said => {
//     Object.keys(contracts[said]).forEach(product => {
//       const { contract } = contracts[said][product].systems[0];
//       const status = contractStatus(contract);
//       const type = contractType(contract);
//       // debugger;
//       // partStat[status][type] += contracts[said][product].serials.length;
//       partStat[status][type] += contracts[said][product].systems.length;
//     });
//   });

//   return partStat;
// };

// const groupSystemsByContracts = systems => {
//   const contracts = {};

//   systems.sort((a, b) => {
//     const compare = a.contract.response.localeCompare(b.contract.response);
//     if (compare === 0) {
//       return a.contract.customer.localeCompare(b.contract.customer);
//     }

//     return compare;
//   });

//   systems.forEach(system => {
//     if (typeof contracts[system.contract.said] === 'undefined') {
//       contracts[system.contract.said] = {};
//     }

//     if (
//       typeof contracts[system.contract.said][system.product.productNumber] ===
//       'undefined'
//     ) {
//       contracts[system.contract.said][system.product.productNumber] = {};

//       contracts[system.contract.said][
//         system.product.productNumber
//       ].systems = [];

//       contracts[system.contract.said][
//         system.product.productNumber
//       ].serials = [];
//     }
//     contracts[system.contract.said][system.product.productNumber].systems.push(
//       system
//     );

//     if (system.serialList.length) {
//       contracts[system.contract.said][
//         system.product.productNumber
//       ].serials.push(system.serialList);
//     }
//   });
//   return contracts;
// };

const addStockPartRow = async (stockPart, sheet, dir) => {
  // const feParts = await partController.getPartFieldEquiv(stockPart.part.id);
  // const fePartIds = feParts.map(p => p.id);
  // const systems = await systemController.findSystemsWithPart([
  //   ...fePartIds,
  //   stockPart.part.id
  // ]);

  // // group by contracts / products
  // const contracts = groupSystemsByContracts(systems);
  // const partStatus = setPartStatus(contracts);

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
    // '',
    // '',
    // '',
    // '',
    // '',
    // '',
    // '',
    // '',
    // '',
    // '',
    // ''
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

  // Object.keys(contracts).forEach(said => {
  //   Object.keys(contracts[said]).forEach(product => {
  //     const s = contracts[said][product].systems;

  //     // if (!s[0].parts && !s[0].product.parts) {
  //     //   debugger;
  //     // }

  //     let parts;
  //     if (s[0].parts) {
  //       parts = s[0].parts.map(p => p.partNumber);
  //     } else if (s[0].product.parts) {
  //       parts = s[0].product.parts.map(p => p.partNumber);
  //     }
  //     //  debugger;

  //     sheet.addRow([
  //       '', // 1
  //       '', // 2
  //       '', // 3
  //       '', // 4
  //       '', // 5
  //       '', // 6
  //       '', // 7
  //       '', // 8
  //       '', // 9
  //       '', // 10
  //       '', // 11
  //       '', // 12
  //       '', // 13
  //       '', // 14
  //       '', // 15
  //       '', // 16
  //       '', // 17
  //       '', // 18
  //       `${s[0].contract.customer} - ${s[0].contract.city}`, // 19
  //       `'${s[0].contract.said}`, // 20
  //       s[0].contract.response, // 21
  //       contractStatus(s[0].contract), // status 22
  //       dayjs(s[0].contract.startDate, 'MMDDYY').format('MM/DD/YYYY'), // 23
  //       dayjs(s[0].contract.endDate, 'MMDDYY').format('MM/DD/YYYY'), // 24
  //       contracts[said][product].serials.join(','), // 25
  //       product, // p, // 26
  //       s[0].product.description, // list[c][s][p].prodDesc, // 27
  //       contracts[said][product].serials.length, // list[c][s][p].qty, // 28
  //       parts ? parts.join(',') : '' // , // list[c][s][p].equiv, // 29
  //       // '' // list[c][s][p].wasSearched // 30
  //     ]);

  //     // eslint-disable-next-line no-unused-vars
  //     sheet.lastRow.eachCell((cell, colNumber) => {
  //       cell.fill = {
  //         type: 'pattern',
  //         pattern: 'solid',
  //         fgColor: { argb: 'FFFFFFFF' },
  //         bgColor: { argb: 'FFFFFFFF' }
  //       };
  //     });
  //   });
  // });

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

    const stockParts = await Stock.findAll({
      where: {},
      include: [{ model: Part }]
    });

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
