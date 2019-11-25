const fs = require('fs');
const path = require('path');

function findFiles(base, filter, files, result) {
  files = files || fs.readdirSync(base);
  result = result || [];

  files.forEach(
    file => {
      const newbase = path.join(base, file);
      const fileStat = fs.statSync(newbase);
      // 忽略软连接
      if (fileStat.isSymbolicLink()) {
        return;
      }

      // 忽略隐藏的目录
      if (/^\..*/.test(file) && fileStat.isDirectory()) {
        return;
      }

      if (fileStat.isDirectory()) {
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
