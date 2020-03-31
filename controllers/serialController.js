/* eslint-disable no-restricted-syntax */
const sequelize = require('sequelize');
const { ipcRenderer } = require('electron');
const Serial = require('../models/Serial');
const SerialPart = require('../models/SerialPart');
const partController = require('./partController');
const browserController = require('./browserController');

const { Op } = sequelize;

exports.addSerialList = async system => {
  try {
    const serialSearch = system.serialList.map(s => {
      return { [Op.like]: `%${s}%` };
    });

    const [serialdb, created] = await Serial.findCreateFind({
      where: {
        serialNum: { [Op.or]: serialSearch }
      },
      defaults: {
        serialNum: system.serialList[0],
        parentSerialId: 0,
        productNumber: system.productNumber
      }
    });

    console.log(
      created
        ? `Added serial ${serialdb.serialNum}`
        : `Updated serial ${serialdb.serialNum}`
    );

    return Promise.resolve(serialdb.id);
  } catch (error) {
    return Promise.reject(error);
  }
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

const getDataFromSystemPage = async (serial, page) => {
  try {
    const spareBom = await page.evaluate(() =>
      document.getElementById('ctl00_BodyContentPlaceHolder_tdSpareBOM')
    );
    if (!spareBom) {
      await serial.update({ scanStatus: 'NO_DATA' });
      return Promise.resolve('NO_DATA');
    }

    const partsAdvTab = await getSystemAdvancedTab(page);
    const partsAdded = await partController.addPartsFromPartSurfer(partsAdvTab);

    const serialParts = [];
    partsAdded.forEach(part =>
      serialParts.push({
        serialId: serial.id,
        partId: part.id
      })
    );

    await SerialPart.bulkCreate(serialParts);

    await serial.update({ scanStatus: 'SCANNED' });
    return Promise.resolve('SCANNED');
  } catch (error) {
    return Promise.reject(error);
  }
};

const checkForProductSelection = (serial, page) => {
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
      }, serial.productNumber)
      .then(select => resolve(select))
      .catch(err => reject(err));
  });
};

const processSerialPage = async (serial, page) => {
  try {
    const select = await checkForProductSelection(serial, page);
    let result;
    if (select.length > 0) {
      const itemFound = select.filter(obj => obj.clicked === true);

      if (!itemFound) {
        await serial.update({ scanStatus: 'NO_DATA' });
        return Promise.resolve('NO_DATA');
      }

      await Promise.all([
        page.click('#ctl00_BodyContentPlaceHolder_btnProdSubmit'),
        page.waitForNavigation({ timeout: 300000 })
      ]);

      result = await getDataFromSystemPage(serial, page);
    } else {
      result = await getDataFromSystemPage(serial, page);
    }

    return Promise.resolve(result);
  } catch (error) {
    return Promise.reject(error);
  }
};

const inputSystemSerial = async (serialNum, page) => {
  try {
    const input = await page.$(
      '#ctl00_BodyContentPlaceHolder_SearchText_TextBox1'
    );

    await input.click({ clickCount: 3 });
    await input.type(serialNum);
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.getPartsForSerial = async (serial, browserId) => {
  try {
    const browser = browserController.instances[browserId];
    await browser.init();
    const page = await browser.openNewPage(`https://partsurfer.hpe.com/`);

    await inputSystemSerial(serial.serialNum, page);

    await Promise.all([
      page.click('#ctl00_BodyContentPlaceHolder_SearchText_btnSubmit'),
      page.waitForNavigation({ timeout: 300000 })
    ]);

    const noData = await page.evaluate(() =>
      document.getElementById('ctl00_BodyContentPlaceHolder_lblNoDataFound')
    );

    if (noData) {
      await serial.update({ scanStatus: 'NO_DATA' });
      await page.close();
      return Promise.resolve('NO_DATA');
    }

    await processSerialPage(serial, page);
    await page.close();
    await browser.close();
    return Promise.resolve('SCANNED');
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.totalSerialsToScan = 0;
exports.curSerialItem = 0;

exports.getSerialDataFromPartSurfer = async () => {
  try {
    const serials = await Serial.findAll({ where: { scanStatus: null } });

    if (!serials || !serials.length) {
      return Promise.resolve();
    }

    const { concurrency } = browserController;
    browserController.closeBrowsers();
    browserController.createBrowsers();

    let promiseArray = [];
    // let curItem = 0;
    let scanList = [];
    let browserId = 0;

    if (this.totalSerialsToScan < 1) {
      this.totalSerialsToScan = 0;
      this.curSerialItem = 0;
    }
    for (const serial of serials) {
      scanList.push(serial.serialNum);

      promiseArray.push(this.getPartsForSerial(serial, browserId));
      browserId++;
      this.curSerialItem++;

      if (promiseArray.length === concurrency) {
        ipcRenderer.send('set-progress', {
          mainItem: 'Getting parts for the serial',
          subItem: scanList.join(' '),
          curItem: this.curSerialItem,
          totalItem: serials.length
        });

        await Promise.all(promiseArray);
        promiseArray = [];
        scanList = [];
        browserId = 0;
      }
    }

    if (promiseArray.length) {
      ipcRenderer.send('set-progress', {
        mainItem: 'Getting parts for the serial',
        subItem: scanList.join(' '),
        curItem: this.curSerialItem,
        totalItem: serials.length
      });

      await Promise.all(promiseArray);
    }

    browserController.closeBrowsers();
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};
