/* eslint-disable no-restricted-syntax */
const configFilesController = require('../controllers/configFilesController');

const ccode = { Lithuania: 'LT', Ukraine: 'UA', Belarus: 'BY' };
class StockMap {
  constructor(stockName, cityNames) {
    this.stockName = stockName;
    this.cityNames = cityNames;
  }
}

const defaultStockMapUA = [
  new StockMap('kyiv', ['kyiv']),
  new StockMap('dnipro', ['dnipro']),
  new StockMap('lviv', ['lviv']),
  new StockMap('odesa', ['odesa']),
  new StockMap('ignore', [])
];

const defaultStockMapLT = [
  new StockMap('vilnius', ['vilnius'], true),
  new StockMap('ignore', [
    'tallinn',
    'kyiv',
    'odessa',
    'dnipro',
    'kyiv ukraine',
    'riga',
    'tbilisi',
    'rgas rajons'
  ])
];
const defaultStockMapBY = [
  new StockMap('minsk', ['minsk']),
  new StockMap('ignore', [])
];

const defaultStockMaps = {
  LT: defaultStockMapLT,
  UA: defaultStockMapUA,
  BY: defaultStockMapBY
};

const stockMaps = {
  LT: {
    defaultStock: 'vilnius',
    stocks: defaultStockMaps.LT
  },
  UA: {
    defaultStock: 'kyiv',
    stocks: defaultStockMaps.UA
  },
  BY: {
    defaultStock: 'minsk',
    stocks: defaultStockMaps.BY
  }
};

exports.getStocks = country => {
  const stocks = [];
  stockMaps[ccode[country]].stocks.forEach(stockMap => {
    if (stockMap.stockName !== 'ignore') {
      stocks.push(stockMap.stockName.toUpperCase());
    }
  });
  return stocks;
};

exports.getCurrentStocks = () => {
  const country = configFilesController.getImportCountry();
  return this.getStocks(country);
};

exports.getCityStock = (country, city) => {
  if (typeof stockMaps[country] === 'undefined') {
    return 'default';
  }

  let stockName = '';
  const findCity = city.toLowerCase();
  for (const stockMap of stockMaps[country].stocks) {
    const found = stockMap.cityNames.find(cityName => cityName === findCity);
    if (found) {
      stockName = stockMap.stockName;
      break;
    }
  }

  if (!stockName) {
    stockName = stockMaps[country].defaultStock;
  }

  return stockName.toUpperCase();
};

exports.importStockMaps = maps => {
  const country = configFilesController.getImportCountry();
  const cc = ccode[country];
  // reset to default
  stockMaps[cc].stocks = defaultStockMaps[cc];

  // import
  maps.forEach(map => {
    if (map) {
      const stockCity = map.contractStock.toLowerCase();
      const contractCity = map.contractCity.toLowerCase();

      const stockMapFound = stockMaps[cc].stocks.find(
        stockMap => stockMap.stockName === stockCity
      );
      if (stockMapFound) {
        const found = stockMapFound.cityNames.find(
          cityName => cityName === contractCity
        );
        if (!found) {
          stockMapFound.cityNames.push(contractCity);
        }
      }
    }
  });
};
