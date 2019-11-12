const Columns = {
  stockFile: {
    partNumber: {
      names: ["part number", "part", "p/n"]
    },
    qty: {
      names: ["qty", "material left"]
    },
    description: {
      names: ["description"]
    },
    price: {
      names: ["unit price", "price"]
    }
  },
  salesDataFile: {
    country: {
      names: ["hwst country cd"]
    },
    city: {
      names: ["hwst city"]
    },
    customer: {
      names: ["hwst name"]
    },
    productNumber: {
      names: ["product nbr"]
    },
    productDesc: {
      names: ["product desc"]
    },
    response: {
      names: ["response"]
    },
    serial: {
      names: ["serial nbr"]
    },
    said: {
      names: ["service agreement id"]
    },
    funcLoc: {
      names: ["functional location"]
    },
    startDate: {
      names: ["contract start date"]
    },
    endDate: {
      names: ["contract end date"]
    }
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
            typeof cell.value === "string" &&
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
  if (str === null || str === "") return "";
  return str.replace(/[^0-9a-zA-Z- ]/g, "");
};

Columns.getData = (fileType, row) => {
  const obj = {};
  Object.keys(Columns[fileType]).forEach(key => {
    if (Columns[fileType][key].id > 0) {
      let { value } = row.getCell(Columns[fileType][key].id);

      // if (key === 'country') {
      //   debugger;
      // }

      if (typeof value === "object") {
        value = "";
      } else if (typeof value === "string") {
        value = removeNonAscii(value.trim());
      }
      obj[key] = value;
    }
  });

  return obj;
};

module.exports = Columns;
