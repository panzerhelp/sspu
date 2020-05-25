const Columns = {
  stockFile: {
    partNumber: { names: ['part number', 'part', 'p/n'] },
    qty: { names: ['qty', 'material left', 'total stock'] },
    location: { names: ['whs', 'location'] },
    description: { names: ['description'] },
    price: { names: ['unit price', 'price'] }
  },
  caseUsageFile: {
    date: { names: ['casedate'] },
    caseId: { names: ['sfdc case id'] },
    customer: { names: ['customer'] },
    response: { names: ['response'] },
    sla: { names: ['sla'] },
    serviceLevel: { names: ['service level'] },
    serial: { names: ['serial number'] },
    product: { names: ['product number'] },
    contract: { names: ['contract id'] },
    gcsn: { names: ['gcsn'] },
    sparePart: { names: ['spare part'] },
    qty: { names: ['qty'] },
    partner: { names: ['hpd partner'] },
    stockLocation: { names: ['stock location'] },
    status: { names: ['status'] },
    feUsed: { names: ['fe used'] },
    deliveryDate: { names: ['delivered'] }
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
    startDate: { names: ['contract start date', 'contract start date'] },
    endDate: { names: ['contract end date', 'contract term date'] },
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

const removeNonAscii = str => {
  if (str === null || str === '') return '';
  return str.replace(/[^0-9a-zA-Z- ]/g, '');
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
          value = removeNonAscii(value.trim());
        }
        obj[key] = value;
      }
    }
  });

  return obj;
};

module.exports = Columns;
