const colNum = columns => {
  let num = 0;

  columns.forEach(col => {
    if (col.subColumns.length) {
      num += col.subColumns.length;
    } else {
      num++;
    }
  });

  return num;
};

module.exports = colNum;
