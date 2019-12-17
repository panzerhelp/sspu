/* eslint-disable no-param-reassign */
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const configFilesController = require('../configFilesController');
const colNum = require('./colNum');

dayjs.extend(customParseFormat);

const addTitleRow = (title, columns, sheet) => {
  const date = dayjs().format('YYYY-MMM-DD');
  const country = configFilesController.getImportCountry();

  sheet.addRow([`${country} - ${title} (${date})`]);
  sheet.mergeCells(
    sheet.lastRow._number,
    1,
    sheet.lastRow._number,
    colNum(columns)
  );

  sheet.getCell(1, 1).font = {
    size: 18,
    bold: true,
    color: { argb: 'FFFFFFFF' }
  };
  sheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF333333' },
    bgColor: { argb: 'FF333333' }
  };
};

module.exports = addTitleRow;
