const fs = require('fs');

const fsPromises = fs.promises;

const checkFileBusy = async outFile => {
  if (!fs.existsSync(outFile)) {
    return Promise.resolve();
  }

  let filehandle;
  try {
    filehandle = await fsPromises.open(outFile, 'r+');
    if (filehandle !== undefined) await filehandle.close();
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = checkFileBusy;
