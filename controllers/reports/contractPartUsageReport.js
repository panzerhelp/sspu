/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
const { ipcRenderer } = require('electron');
const Excel = require('exceljs');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const sequelize = require('sequelize');

const addTitleRow = require('./addTitleRow');
const addMainRow = require('./addMainRow');
const setColWidth = require('./setColWidth');
const contractType = require('./contractType');
const contractStatus = require('./contractStatus');
const Status = require('./Status');
const colNum = require('./colNum');

const Contract = require('../../models/Contract');
// const Product = require('../../models/Product');
// const System = require('../../models/System');
// const Serial = require('../../models/Serial');
// const Part = require('../../models/Part');

const checkFileBusy = require('./checkFileBusy');
const configFilesController = require('../configFilesController');

const XCol = require('./XCol');

dayjs.extend(customParseFormat);

const customerListColumns = [
  new XCol(1, 'Customer', 40, []),
  new XCol(2, 'Contract Count', 15, []),
  new XCol(3, 'Active', 10, [
    new XCol(3, 'CTR+SD', 10, []),
    new XCol(4, 'CTR', 10, []),
    new XCol(5, 'SD', 10, []),
    new XCol(6, 'ND', 10, [])
  ]),
  new XCol(7, 'Active 6m', 10, [
    new XCol(7, 'CTR+SD', 10, []),
    new XCol(8, 'CTR', 10, []),
    new XCol(9, 'SD', 10, []),
    new XCol(10, 'ND', 10, [])
  ]),
  new XCol(11, 'Expired', 10, [
    new XCol(11, 'CTR+SD', 10, []),
    new XCol(12, 'CTR', 10, []),
    new XCol(13, 'SD', 10, []),
    new XCol(14, 'ND', 10, [])
  ])
];

const getCustomerContractStatus = async customer => {
  try {
    const contracts = await Contract.findAll({
      where: { customer: customer }
    });

    const status = new Status();

    contracts.forEach(contract => {
      const t = contractType(contract);
      const s = contractStatus(contract);
      status[s][t]++;
    });

    return Promise.resolve(status);
  } catch (error) {
    return Promise.reject(error);
  }
};

const addCustomerRow = async (contract, sheet) => {
  try {
    // const count = await Contract.count({
    //   where: { customer: contract.customer }
    // });

    // const contracts = await Contract.findAll({
    //   where: { customer: contract.customer }
    // });

    const custName = contract.customer || 'NO_NAME';

    const status = await getCustomerContractStatus(contract.customer);
    await sheet.addRow([
      custName,
      contract.dataValues.contractNum,
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
      status.expired.nd
    ]);
    Promise.resolve();
  } catch (error) {
    Promise.reject(error);
  }
};

const contractPartUsageReport = async () => {
  try {
    const outFile = configFilesController.getOutputFile('contractUsage');
    await checkFileBusy(outFile);

    // const customers = await Contract.aggregate('customer', 'DISTINCT', {
    //   plain: false
    // });

    const contracts = await Contract.findAll({
      attributes: [
        'customer',
        [sequelize.fn('COUNT', sequelize.col('customer')), 'contractNum']
      ],
      group: ['customer'],
      order: [[sequelize.fn('COUNT', sequelize.col('customer')), 'DESC']]
    });

    const wb = new Excel.stream.xlsx.WorkbookWriter({
      filename: outFile,
      useStyles: true,
      useSharedStrings: true
    });

    const sheet = wb.addWorksheet('Customers', {
      views: [{ state: 'frozen', ySplit: 3 }],
      properties: { tabColor: { argb: 'FFFFFFFF' } }
    });

    addTitleRow('Contract Part Usage', customerListColumns, sheet);
    addMainRow(customerListColumns, sheet);

    let curItem = 1;
    for (const contract of contracts) {
      ipcRenderer.send('set-progress', {
        mainItem: `Generating contract usage report`,
        subItem: contract.customer,
        curItem: curItem,
        totalItem: contracts.length
      });
      await addCustomerRow(contract, sheet);
      curItem++;
    }
    // const customers = await Contract.findAll({
    //   attributes: [
    //     // specify an array where the first element is the SQL function and the second is the alias
    //     [sequelize.fn('DISTINCT', sequelize.col('customer')), 'customer']

    //     // specify any additional columns, e.g. country_code
    //     // 'country_code'
    //   ]
    // });

    // const contracts = await Contract.findAll({
    //   order: [['customer', 'ASC']]
    // });

    // const systems = await System.findAll({
    //   include: [{ model: Contract }, { model: Product }, { model: Serial }]
    // });

    // const contracts = await Contract.findAll({
    //   where: { response: { [sequelize.Op.or]: ['CTR', 'Ctr6HR'] } },
    //   include: [
    //     {
    //       model: Product,
    //       required: true
    //     }
    //   ]
    // });

    sheet.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: sheet.lastRow._number, column: colNum(customerListColumns) }
    };

    setColWidth(customerListColumns, sheet);
    await wb.commit();
    return Promise.resolve(outFile);
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = contractPartUsageReport;
