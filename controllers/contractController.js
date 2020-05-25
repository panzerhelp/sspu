/* eslint-disable no-restricted-syntax */
const { ipcRenderer } = require('electron');
const sequelize = require('sequelize');

const Contract = require('../models/Contract');
const Product = require('../models/Product');
const Part = require('../models/Part');
// const PartFieldEquiv = require('../models/PartFieldEquiv');
const Serial = require('../models/Serial');
const System = require('../models/System');

const db = require('../db');

const { Op } = sequelize;

exports.addOneContract = contract => {
  return new Promise((resolve, reject) => {
    Contract.findCreateFind({
      where: { said: contract.said },
      defaults: {
        startDate: contract.startDate,
        endDate: contract.endDate,
        response: contract.response,
        customer: contract.customer,
        country: contract.country,
        city: contract.city
      }
    })
      // eslint-disable-next-line no-unused-vars
      .then(([contractdb, created]) => {
        resolve(contractdb);
      })
      .catch(err => {
        reject(err);
      });
  });
};

exports.addContracts = async contractsData => {
  try {
    const contractIds = {};
    const tot = Object.keys(contractsData).length;
    let cur = 1;
    for (const said in contractsData) {
      if ({}.hasOwnProperty.call(contractsData, said)) {
        const contract = contractsData[said];

        ipcRenderer.send('set-progress', {
          mainItem: 'Importing contracts',
          subItem: `${said}`,
          curItem: cur,
          totalItem: tot
        });

        cur++;

        const { id } = await this.addOneContract({
          said: said,
          startDate: contract.startDate,
          endDate: contract.endDate,
          response: contract.response,
          customer: contract.customer,
          country: contract.country,
          city: contract.city
        });
        contractIds[said] = id;
      }
    }

    return Promise.resolve(contractIds);
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.clearContracts = () => {
  return new Promise((resolve, reject) => {
    Contract.destroy({
      where: {},
      truncate: true
    })
      .then(() => {
        db.query("UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='contracts'")
          .then(resolve())
          .catch(err => reject(err));
      })
      .catch(err => reject(err));
  });
};

exports.getAllContracts = async () => {
  try {
    const contracts = await Contract.findAll({
      attributes: [
        'customer',
        [sequelize.fn('COUNT', sequelize.col('customer')), 'contractNum']
      ],
      group: ['customer'],
      order: [[sequelize.fn('COUNT', sequelize.col('customer')), 'DESC']]
    });

    return Promise.resolve(contracts);
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.getContractsWithParts = async partIds => {
  try {
    // const contracts = await Contract.findAll({
    //   include: [
    //     {
    //       model: System,
    //       required: true,
    //       include: [
    //         {
    //           model: Product,
    //           required: false,

    //           include: [
    //             {
    //               model: Part // ,
    //               // include: [{ model: Part, as: 'fePart' }]
    //             }
    //           ]
    //         },
    //         {
    //           model: Serial,
    //           required: false,
    //           include: [
    //             {
    //               model: Part // ,
    //               // include: [{ model: Part, as: 'fePart' }]
    //             }
    //           ]
    //         }
    //       ]
    //     }
    //   ],
    //   where: {
    //     [Op.or]: [
    //       {
    //         [Op.and]: [
    //           { '$Systems.product.exclude$': false },
    //           { '$Systems.product.parts.exclude$': false },
    //           { '$Systems.product.parts.id$': partIds }
    //         ]
    //       },
    //       {
    //         [Op.and]: [
    //           { '$Systems.serial.parts.exclude$': false },
    //           { '$Systems.serial.parts.id$': partIds }
    //         ]
    //       }
    //     ]
    //   }
    // });

    // const conctractsIds = contracts.map(c => c.id);

    const contracts2 = await Contract.findAll({
      where: {},
      include: [
        {
          model: System,
          required: true,
          include: [
            {
              model: Product,
              where: { exclude: false },
              include: [
                {
                  model: Part,
                  where: { exclude: false, id: partIds }
                }
              ]
            }
          ]
        }
      ]
    });

    // const conctractsIds2 = contracts2.map(c => c.id);

    const contracts3 = await Contract.findAll({
      where: {},
      include: [
        {
          model: System,
          required: true,
          include: [
            {
              model: Product,
              where: { exclude: false }
            },
            {
              model: Serial,
              required: true,
              include: [{ model: Part, where: { exclude: false, id: partIds } }]
            }
          ]
        }
      ]
    });

    // const conctractsIds3 = contracts3.map(c => c.id);

    for (const c3 of contracts3) {
      let found = false;
      for (const c2 of contracts2) {
        if (c2.id === c3.id) {
          found = true;
          break;
        }
      }

      if (!found) {
        contracts2.push(c3);
      }
    }

    // console.log(conctractsIds);
    // console.log(conctractsIds2);
    // console.log(conctractsIds3);

    // if (partIds[0] === 12) {
    //   debugger;
    // }
    // const systems = await System.findAll({
    //   where: {},
    //   include: [
    //     {
    //       model: Contract,
    //       required: true
    //     },
    //     {
    //       model: Product,
    //       where: { exclude: false },
    //       required: true,
    //       include: [
    //         {
    //           model: Part,
    //           required: true,
    //           where: { id: partIds, exclude: false }
    //         }
    //       ]
    //     },
    //     {
    //       model: Serial,
    //       include: [
    //         {
    //           model: Part,
    //           required: true,
    //           where: { id: partIds, exclude: false }
    //         }
    //       ]
    //     }
    //   ]
    // });
    return Promise.resolve(contracts2);
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.getContractsWithCutomer = async customer => {
  try {
    const contracts = await Contract.findAll({
      where: { customer: customer },
      include: {
        model: System,
        include: [
          {
            model: Product,
            where: { exclude: false } // ,
            // include: [
            //   {
            //     model: Part,
            //     where: { exclude: false },
            //     attributes: ['id']
            //   }
            // ]
          },
          {
            model: Serial,
            required: false // ,
            // include: [
            //   {
            //     model: Part,
            //     where: { exclude: false },
            //     attributes: ['id']
            //   }
            // ]
          }
        ]
      }
    });
    return Promise.resolve(contracts);
  } catch (error) {
    return Promise.reject(error);
  }
};
