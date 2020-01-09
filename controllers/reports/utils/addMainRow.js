/* eslint-disable no-param-reassign */
const addOneRow = (columns, sheet, subRow) => {
  let hasSubRow = false;
  const values = [];

  columns.forEach(column => {
    if (!subRow || !column.subColumns.length) {
      values.push(column.title);
    }

    let subCols = 0;
    column.subColumns.forEach(subCol => {
      if (subCols && !subRow) {
        values.push('');
        hasSubRow = true;
      } else if (subRow) {
        values.push(subCol.title);
      }
      subCols++;
    });
  });
  sheet.addRow(values);
  return hasSubRow;
};

const addMainRow = (columns, sheet) => {
  const hasSubRow = addOneRow(columns, sheet, false);
  if (hasSubRow) {
    addOneRow(columns, sheet, true);
  }

  // merge cells
  const firstRow = sheet.lastRow._number - 1;
  columns.forEach(column => {
    if (column.subColumns.length) {
      sheet.mergeCells(
        firstRow,
        column.id,
        firstRow,
        column.id + column.subColumns.length - 1
      );
    } else if (hasSubRow) {
      sheet.mergeCells(firstRow, column.id, firstRow + 1, column.id);
    }

    sheet.getCell(firstRow, column.id).alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };
  });
};

module.exports = addMainRow;
