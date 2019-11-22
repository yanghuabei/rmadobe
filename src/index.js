const {
  Command,
  flags
} = require('@oclif/command')
const shell = require('shelljs');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const base64Util = require('base64-img');

const findFiles = require('./findFiles');

const PURIFY_IMAGE_CMD = 'exiftool -ext jpg -ext jpeg -ext gif -ext png -ext bmp  -adobe:all= -xmp:all= -photoshop:all= "-*:Software=" -tagsfromfile @ -iptc:all -overwrite_original';
const REG = /data:image\/.+;base64,([a-zA-Z0-9+/]+={0,2})/;
const EXTRACT_REG = /['"(](data:image\/.+;base64,[a-zA-Z0-9+/]+={0,2})['")]/g;
const FILES_INCLUDES = /\.(js|jsx|ts|tsx|scss|css)$/;

class RmadobeCommand extends Command {
  async run() {
    const { flags } = this.parse(RmadobeCommand)
    const dir = flags.dir || process.cwd();

    // 找到目标文件
    const files = this.getFiles(dir);

    console.log(`${files.length} files found!`);

    // 准备工作
    this.logPath = path.join(this.config.dataDir, `log-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.json`);
    this.logs = [];
    let filesNum = files.length;

    // 开始处理
    files.forEach(file => {
      this.rmAdobe(file);
      console.log(`${filesNum--} files remain.`);
    });

    console.log(`Success!`);
    fs.writeFileSync(this.logPath, JSON.stringify(this.logs, null, 4), { encoding: 'utf-8' });
    console.log(`Check rm details here: ${this.logPath}`);
  }

  getFiles(searchDir) {
    return findFiles(searchDir, file => !file.includes('node_modules') && FILES_INCLUDES.test(file));
  }

  base64ToFile(imageString) {
    shell.rm(`${this.config.dataDir}/temp/*`);
    return base64Util.imgSync(imageString, `${this.config.dataDir}/temp/`, 'temp');
  }

  isValidImage(imageString) {
    const result = shell.exec(`echo ${imageString} | base64 -D | exiftool -`).stdout;
    return !result.toLowerCase().includes('adobe');
  }

  rmAdobe(file) {
    let content = fs.readFileSync(file, {
      encoding: 'utf-8'
    });

    content
      .split('\n')
      .filter(line => !!line && REG.test(line))
      .forEach(line => {
        let matcher = EXTRACT_REG.exec(line);
        while (matcher) {
          const fullBase64 = matcher[1];
          const realImageString = fullBase64.match(REG)[1];
          const valid = this.isValidImage(realImageString);
          if (!valid) {
            const tempFile = this.base64ToFile(fullBase64);
            const result = shell.exec(`${PURIFY_IMAGE_CMD} ${tempFile}`);
            if (result.code === 0) {
              const newBase64 = base64Util.base64Sync(tempFile);
              content = content.replace(fullBase64, newBase64);
              this.logs.push({ file, before: fullBase64, after: newBase64 });
            }
          }

          matcher = EXTRACT_REG.exec(line);
        }
      });
    fs.writeFileSync(file, content, {
      encoding: 'utf-8',
    });
  }
}

RmadobeCommand.description = `Describe the command here
...
Extra documentation goes here
`

RmadobeCommand.flags = {
  // add --version flag to show CLI version
  version: flags.version({
    char: 'v'
  }),
  // add --help flag to show CLI version
  help: flags.help({
    char: 'h'
  }),
  name: flags.string({
    char: 'n',
    description: 'name to print'
  }),
  dir: flags.string({
    char: 'd',
    description: 'search dir'
  }),
}

module.exports = RmadobeCommand;
