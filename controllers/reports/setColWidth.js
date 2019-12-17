/* eslint-disable no-param-reassign */

const setColWidth = (columns, sheet) => {
  columns.forEach(column => {
    if (column.subColumns.length) {
      column.subColumns.forEach(
        // eslint-disable-next-line no-return-assign
        subCol => (sheet.getColumn(subCol.id).width = subCol.width)
      );
    } else {
      sheet.getColumn(column.id).width = column.width;
    }
  });
};

module.exports = setColWidth;
