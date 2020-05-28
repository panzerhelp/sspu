/* eslint-disable no-restricted-syntax */
const { ipcRenderer } = require('electron');
const Case = require('../models/Case');
const CasePart = require('../models/CasePart');
const Part = require('../models/Part');

exports.addOneCase = async caseData => {
  try {
    const [casedb] = await Case.findCreateFind({
      where: { caseId: caseData.caseId },
      defaults: caseData
      // defaults: {
      //   date: caseData.date,
      //   customer: caseData.customer,
      //   response: caseData.response,
      //   serial: caseData.serial,
      //   product: caseData.product,
      //   contract: caseData.contract,
      //   partner: caseData.partner
      // }
    });

    const part = await Part.findOne({
      where: { partNumber: caseData.sparePart }
    });

    if (casedb && part) {
      await CasePart.create({
        caseId: casedb.id,
        partId: part.id,
        date: caseData.date,
        status: caseData.status,
        feUsed: caseData.feUsed,
        gcsn: caseData.gcsn,
        qty: caseData.qty,
        deliveryDate: caseData.deliveryDate
      });
    }

    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.addCaseData = async casePartUsageData => {
  try {
    const tot = casePartUsageData.length;
    let cur = 1;
    for (const casePartUsage of casePartUsageData) {
      if (casePartUsage) {
        if (casePartUsage.caseId === 'not created') {
          casePartUsage.caseId = `DUMMY-${casePartUsage.date}-${casePartUsage.serial}`;
        }
        ipcRenderer.send('set-progress', {
          mainItem: 'Importing case part usage',
          subItem: `${casePartUsage.caseId}`,
          curItem: cur,
          totalItem: tot
        });
        await this.addOneCase(casePartUsage);
      }
      cur++;
    }

    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.findCasesWithProduct = async productName => {
  try {
    const cases = await Case.findAll({
      where: { product: productName },
      include: [{ model: CasePart, required: true, include: [{ model: Case }] }]
    });
    return Promise.resolve(cases);
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.clearCaseUse = async () => {
  try {
    await CasePart.destroy({ where: {} });
    await Case.destroy({ where: {} });
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};
