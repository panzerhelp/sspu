/* eslint-disable no-restricted-syntax */
const sequelize = require('sequelize');
const System = require('../models/System');
const SystemPart = require('../models/SystemPart');
// const db = require('../db');
const Browser = require('../models/Browser');
const Product = require('../models/Product');
const partController = require('./partController');
const Contract = require('../models/Contract');

// const Contract = require('../models/Contract');

exports.addOneSystem = system => {
  return new Promise((resolve, reject) => {
    System.findCreateFind({
      where: { serial: system.serial },
      defaults: {
        contractId: system.contractId,
        productId: system.productId
      }
    })
      .then(([systemdb, created]) => {
        console.log(`Added system with serial ${systemdb.serial}`);
        resolve(systemdb.dataValues);
      })
      .catch(err => {
        reject(err);
      });
  });
};

exports.addSystems = (systemsData, productIds, contractIds) => {
  return new Promise((resolve, reject) => {
    const promiseArray = [];

    Object.keys(systemsData).forEach(serial => {
      promiseArray.push(
        this.addOneSystem({
          serial: serial,
          contractId: contractIds[systemsData[serial].contract],
          productId: productIds[systemsData[serial].product]
        })
      );
    });

    Promise.all(promiseArray).then(
      systems => {
        const systemIds = Object.assign(
          {},
          ...systems.map(system => ({ [system.serial]: system.id }))
        );
        resolve(systemIds);
      },
      reason => {
        reject(reason);
      }
    );
  });
};

exports.browser = null;

const getSystemAdvancedTab = page => {
  return new Promise((resolve, reject) => {
    page
      .evaluate(() => {
        const partNumber = Array.from(
          document.querySelectorAll('span[id$="spart1"]')
        ).map(el => {
          return el.textContent;
        });
        const descriptionShort = Array.from(
          document.querySelectorAll('span[id$="lblspartdesc1"]')
        ).map(el => {
          return el.textContent;
        });
        // const descE = Array.from(
        //   document.querySelectorAll('span[id$="lblspartdesc1_Enhanced"]')
        // ).map(el => {
        //   return el.textContent;
        // });
        const category = Array.from(
          document.querySelectorAll('span[id$="lblCategory1"]')
        ).map(el => {
          return el.textContent;
        });
        const mostUsed = Array.from(
          document.querySelectorAll('span[id$="lblMostUsed"]')
        ).map(el => {
          return el.textContent;
        });
        const csr = Array.from(
          document.querySelectorAll('span[id$="lblCSR1"]')
        ).map(el => {
          return el.textContent;
        });

        return partNumber
          .map((pn, i) => ({
            key: pn,
            value: {
              partNumber: pn,
              description: '',
              descriptionShort: descriptionShort[i],
              category: category[i],
              mostUsed: mostUsed[i],
              csr: csr[i]
            }
          }))
          .reduce((map, obj) => {
            // eslint-disable-next-line no-param-reassign
            map[obj.key] = obj.value;
            return map;
          }, {});
      })
      .then(partsAdvTab => resolve(partsAdvTab))
      .catch(err => reject(err));
  });
};

const getDataFromSystemPage = (system, page) => {
  return new Promise((resolve, reject) => {
    page
      .evaluate(() =>
        document.getElementById('ctl00_BodyContentPlaceHolder_tdSpareBOM')
      )
      .then(spareBom => {
        if (!spareBom) {
          system
            .update({ scanStatus: 'NO_DATA' })
            .then(resolve('NO_DATA'))
            .catch(err => reject(err));
        } else {
          getSystemAdvancedTab(page)
            .then(partsAdvTab => {
              partController
                .addPartsFromPartSurfer(partsAdvTab)
                .then(partsAdded => {
                  const systemParts = [];
                  partsAdded.forEach(part =>
                    systemParts.push({
                      systemId: system.id,
                      partId: part.id
                    })
                  );
                  SystemPart.bulkCreate(systemParts)
                    .then(() => {
                      system
                        .update({ scanStatus: 'SCANNED' })
                        .then(resolve('SCANNED')) // RESOLVED WITH STATUS SCANNED
                        .catch(err => reject(err));
                    })
                    .catch(err => reject(err));
                })
                .catch(err => reject(err));
            })
            .catch(err => reject(err));
        }
      })
      .catch(err => reject(err));
  });
};

const checkForProductSelection = (system, page) => {
  return new Promise((resolve, reject) => {
    page
      .evaluate(product => {
        const radioButtons = document.querySelectorAll(
          'input[id^=ctl00_BodyContentPlaceHolder_radProd_]'
        );
        const select = [];
        let found = false;
        // eslint-disable-next-line no-restricted-syntax
        for (const rb of radioButtons) {
          let prodStr;
          // remove option;
          if (rb.value.indexOf('#') !== -1) {
            prodStr = rb.value.substr(0, rb.value.indexOf('#'));
          } else {
            prodStr = rb.value;
          }

          if (prodStr === product) {
            select.push({ product: rb.value, clicked: true });
            rb.click();
            found = true;
          } else {
            select.push({ product: rb.value, clicked: false });
          }
        }

        // product was not found, click firt radio button to unlock search.
        if (!found && radioButtons.length > 0) {
          radioButtons[0].click();
        }

        return select;
      }, system.product.productNumber)
      .then(select => resolve(select))
      .catch(err => reject(err));
  });
};

const processSystemPage = (system, page) => {
  return new Promise((resolve, reject) => {
    checkForProductSelection(system, page)
      .then(select => {
        if (select.length > 0) {
          const itemFound = select.filter(obj => obj.clicked === true);
          if (!itemFound) {
            system
              .update({ scanStatus: 'NO_DATA' })
              .then(resolve('NO_DATA'))
              .catch(err => reject(err));
          } else {
            Promise.all([
              page.click('#ctl00_BodyContentPlaceHolder_btnProdSubmit'),
              page.waitForNavigation({ timeout: 300000 })
            ]).then(
              () => {
                getDataFromSystemPage(system, page)
                  .then(result => resolve(result))
                  .catch(err => reject(err));
              },
              reason => {
                reject(reason); // failes to navigate to advanced tab
              }
            );
          }
        } else {
          getDataFromSystemPage(system, page)
            .then(result => resolve(result))
            .catch(err => reject(err));
        }
      })
      .catch(err => reject(err));
  });
};

const inputSystemSerial = (system, page) => {
  return new Promise((resolve, reject) => {
    page
      .$('#ctl00_BodyContentPlaceHolder_SearchText_TextBox1')
      .then(input => {
        input
          .click({ clickCount: 3 })
          .then(() => {
            input
              .type(system.serial)
              .then(() => {
                resolve();
              })
              .catch(err => reject(err));
          })
          .catch(err => reject(err));
      })
      .catch(err => reject(err));
  });
};

exports.getSingleSystemDataFromPartSurfer = system => {
  return new Promise((resolve, reject) => {
    this.browser
      .openNewPage(`https://partsurfer.hpe.com/Search.aspx?SearchText`)
      .then(page => {
        inputSystemSerial(system, page)
          .then(() => {
            Promise.all([
              page.click('#ctl00_BodyContentPlaceHolder_SearchText_btnSubmit'),
              page.waitForNavigation({ timeout: 300000 })
            ]).then(
              () => {
                page
                  .evaluate(() =>
                    document.getElementById(
                      'ctl00_BodyContentPlaceHolder_lblNoDataFound'
                    )
                  )
                  .then(noData => {
                    if (noData) {
                      system
                        .update({ scanStatus: 'NO_DATA' })
                        .then(() => {
                          page
                            .close()
                            .then(resolve('NO_DATA')) // resolved with NOT_VALID_PRODUCT
                            .catch(err => reject(err));
                        })
                        .catch(err => reject(err));
                    } else {
                      processSystemPage(system, page)
                        .then(() => {
                          page
                            .close()
                            .then(resolve('SCANNED')) // resolved with SCANNED_PRODUCT
                            .catch(err => reject(err));
                        })
                        .catch(err => reject(err));
                    }
                  })
                  .catch(err => reject(err));
              },
              reason => {
                reject(reason); // failes to navigate to advanced tab
              }
            );
          })
          .catch(err => reject(err));
      })
      .catch(err => reject(err));
  });
};

const getSystemArrayParts = systemArr => {
  return new Promise((resolve, reject) => {
    this.getSingleSystemDataFromPartSurfer(systemArr[0])
      .then(result => {
        systemArr.forEach(system => {
          if (system.id !== systemArr[0].id) {
            system.update({
              scanStatus: result,
              partSystemId: systemArr[0].id
            });
          }
        });
        resolve();
      })
      .catch(err => reject(err));
  });
};

exports.getContractParts = contract => {
  return new Promise((resolve, reject) => {
    System.findAll({
      where: { scanStatus: null, contractId: contract.id },
      include: [{ model: Product }],
      order: [[sequelize.literal('contractId, productId'), 'asc']]
    })
      .then(systems => {
        if (systems.length > 0) {
          const productSystemMap = {};
          systems.forEach(system => {
            if (typeof productSystemMap[system.product.id] === 'undefined') {
              productSystemMap[system.product.id] = [];
            }
            productSystemMap[system.product.id].push(system);
          });
          const promiseArray = [];

          Object.keys(productSystemMap).forEach(product => {
            promiseArray.push(getSystemArrayParts(productSystemMap[product]));
          });

          Promise.all(promiseArray).then(
            () => {
              resolve();
            },
            reason => {
              reject(reason); // failes to navigate to advanced tab
            }
          );
        } else {
          resolve();
        }
      })
      .catch(err => reject(err));
  });
};

exports.getSystemDataFromPartSurfer = async () => {
  // temporary clean scan flags and product parts data
  // await SystemPart.destroy({
  //   where: {},
  //   truncate: true
  // });

  // await db.query("UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='systemParts'");
  // await System.update(
  //   {
  //     scanStatus: null
  //   },
  //   {
  //     where: {
  //       // scanStatus: {
  //       //   [Sequelize.Op.ne]: null
  //       // }
  //     }
  //   }
  // );

  this.browser = new Browser();
  await this.browser.init();

  const contracts = await Contract.findAll();
  for (const contract of contracts) {
    await this.getContractParts(contract);
  }
  // for (const c of contracts) {
  //   const systemsToScan = await System.findAll({
  //     where: { scanStatus: null, contractId: c.id },
  //     include: [{ model: Product }],
  //     order: [[sequelize.literal('contractId, productId'), 'asc']]
  //   });

  //   const scannedProducts = {};
  //   for (const system of systemsToScan) {
  //     try {
  //       // set system part id from the previously scanned system with the same product id
  //       if (typeof scannedProducts[system.product.id] !== 'undefined') {
  //         await system.update({
  //           scanStatus: scannedProducts[system.product.id].result,
  //           partSystemId: scannedProducts[system.product.id].systemId
  //         });
  //       } else {
  //         const result = await this.getSingleSystemDataFromPartSurfer(system);

  //         if (typeof scannedProducts[system.product.id] === 'undefined') {
  //           scannedProducts[system.product.id] = {
  //             result: result,
  //             systemId: system.id
  //           };
  //         }
  //       }
  //     } catch (error) {
  //       console.log(error);
  //     }
  //   }
  // }
};
