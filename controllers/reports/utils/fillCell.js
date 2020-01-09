/* eslint-disable no-param-reassign */
exports.solid = (cell, color) => {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: color },
    bgColor: { argb: color }
  };
};
