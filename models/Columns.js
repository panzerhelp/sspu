const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);

const Columns = {
  stockFile: {
    partNumber: { names: ['part number', 'part', 'p/n'] },
    qty: { names: ['qty', 'material left', 'total stock', 'quantity'] },
    location: { names: ['whs', 'location'] },
    description: { names: ['description'] },
    price: { names: ['unit price', 'price', 'net value'] },
    postDate: { names: ['posting date'], type: 'date' }
  },
  caseUsageFile: {
    date: { names: ['casedate', 'case date', 'time opened'], type: 'date' },
    caseId: { names: ['sfdc case id', 'case number'] },
    customer: { names: ['customer', 'account name'] },
    response: { names: ['response'] },
    sla: { names: ['sla', 'coverage'] },
    serviceLevel: { names: ['service level', 'repair'] },
    serial: { names: ['serial number'] },
    product: { names: ['product number'] },
    contract: { names: ['contract id'] },
    gcsn: { names: ['gcsn'] },
    sparePart: { names: ['spare part', 'part number'] },
    qty: { names: ['qty', 'quantity'] },
    partner: { names: ['hpd partner', 'hdp partner'] },
    stockLocation: { names: ['stock location', 'stock name'] },
    status: { names: ['status', 'source'] },
    feUsed: { names: ['fe used', 'confirmed part number'] },
    deliveryDate: { names: ['delivered', 'requested date'], type: 'date' }
  },
  salesDataFile: {
    country: { names: ['hwst country cd', 'agg ship to ctry code iso'] },
    city: { names: ['hwst city', 'site city'] },
    customer: { names: ['hwst name', 'customer name'] },
    productNumber: { names: ['product nbr', 'product extend'] },
    productDesc: { names: ['product desc', 'product description'] },
    response: { names: ['response', 'service level'] },
    serial: { names: ['serial nbr'] },
    said: { names: ['service agreement id', 'svc agreement id'] },
    funcLoc: { names: ['functional location'] },
    startDate: {
      names: ['contract start date', 'contract start date'],
      type: 'date'
    },
    endDate: {
      names: ['contract end date', 'contract term date'],
      type: 'date'
    },
    qty: { names: ['product quantity'] },
    status: { names: ['renewal status', 'contract status'] },
    package: { names: ['package product description'] },
    offer: { names: ['offer product description'] }
  },
  partExcludeFile: {
    productNumber: { names: ['product number'] },
    partNumber: { names: ['part number'] }
  },
  stockMapFile: {
    contractCity: { names: ['contract site', 'contract city'] },
    contractStock: { names: ['stock'] }
  }
};

Columns.setIds = (fileType, firstRow) => {
  Object.keys(Columns[fileType]).forEach(key => {
    Columns[fileType][key].id = 0;
    Columns[fileType][key].data = []; // clear data
    for (let pass = 0; pass < 2; pass += 1) {
      Columns[fileType][key].names.forEach(name => {
        firstRow.eachCell((cell, colNumber) => {
          if (
            Columns[fileType][key].id < 1 &&
            // cell.value &&
            typeof cell.value === 'string' &&
            ((pass === 0 && cell.value.trim().toLowerCase() === name) || // try to find exact match on initial pass
              (pass === 1 &&
                cell.value
                  .trim()
                  .toLowerCase()
                  .indexOf(name) !== -1))
          ) {
            Columns[fileType][key].id = colNumber; // eslint-disable-line no-param-reassign
          }
        });
      });
    }
  });
};

const cleanString = str => {
  if (str === null || str === '') return '';
  return str.trim().replace(/[|&;$%@"<>()+,]/g, '');
};

const getDateFromExcel = excelDate => {
  let d;
  if (excelDate > 20000000) {
    const yy = Math.floor(excelDate / 10000);
    const mo = Math.floor((excelDate % 10000) / 100);
    const dd = excelDate % 100;
    d = new Date(yy, mo - 1, dd);
  } else {
    // JavaScript dates can be constructed by passing milliseconds
    // since the Unix epoch (January 1, 1970) example: new Date(12312512312);

    // 1. Subtract number of days between Jan 1, 1900 and Jan 1, 1970, plus 1 (Google "excel leap year bug")
    // 2. Convert to milliseconds.
    d = new Date((excelDate - (25567 + 2)) * 86400 * 1000);
  }
  return dayjs(d).format('MMDDYY');
};

const getDateFromString = dateString => {
  const d = dayjs(dateString, 'DD/MM/YYYY HH:mm');

  if (d.isValid()) {
    const formattedDate = d.format('MMDDYY');
    return formattedDate;
  }
  return dateString;
};

Columns.getData = (fileType, row) => {
  const obj = {};
  Object.keys(Columns[fileType]).forEach(key => {
    if (Columns[fileType][key].id > 0) {
      let { value } = row.getCell(Columns[fileType][key].id);
      if (value !== null) {
        if (typeof value === 'object') {
          if (typeof value.result !== 'undefined' && value.result) {
            value = value.result;
          } else {
            value = '';
          }
        }

        if (typeof value === 'string' && value) {
          value = cleanString(value);
        }

        if (Columns[fileType][key].type === 'date') {
          if (typeof value === 'number') {
            value = getDateFromExcel(value);
          } else if (typeof value === 'string') {
            value = getDateFromString(value);
          }
        }

        obj[key] = value;
      }
    }
  });

  return obj;
};

module.exports = Columns;
