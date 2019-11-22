const fs = require('fs');
const path = require('path');

function findFiles(base, filter, files, result) {
  files = files || fs.readdirSync(base);
  result = result || [];

  files.forEach(
    file => {
      const newbase = path.join(base, file);
      if (fs.statSync(newbase).isDirectory()) {
        result = findFiles(newbase, filter, fs.readdirSync(newbase), result);
      } else {
        if (filter(newbase)) {
          result.push(newbase);
        }
      }
    }
  )
  return result;
}

module.exports = findFiles;
