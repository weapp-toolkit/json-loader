import chalk from 'chalk';
import glob from 'glob';
import path from 'path';
import shell from 'shelljs';
import { CommandConfig } from '../@types/common';
import spinner from '../utils/spinner';

const InitCmd: CommandConfig = {
  description: '清理开发目录内的 wxss 和 miniprogram_npm',
  action: async (args, option, ctx) => {
    spinner.logWithSpinner('正在清理...\n');

    let ext = 'css';
    switch (ctx.config.cssPreprocessor) {
      case 'sass': {
        ext = 'scss';
        break;
      }
      case 'less': {
        ext = 'less';
        break;
      }
      default:
    }

    shell.rm('-rf', path.resolve(ctx.srcRoot, '**/miniprogram_npm'));

    glob
      .sync('**/*.{wxss,css}', {
        ignore: ['**/node_modules/**', '**/miniprogram_npm/**'].concat(ctx.config.ignore),
        cwd: ctx.srcRoot,
      })
      .reduce((prev, curr) => {
        const prevExtname = path.extname(prev);
        const currExtname = path.extname(curr);
        const prevFilename = prev.replace(new RegExp(`${prevExtname}$`), '');
        const currFilename = curr.replace(new RegExp(`${currExtname}$`), '');

        if (path.extname(curr) === '.wxss') {
          const currFullPath = path.resolve(ctx.srcRoot, curr);
          if (prevFilename === currFilename) {
            shell.rm(currFullPath);
          } else {
            const renamePath = path.resolve(ctx.srcRoot, `${currFilename}.${ext}`);
            shell.mv(currFullPath, renamePath);
            console.log(chalk.yellow(`已将 \`${currFullPath}\` 重命名为 \`${renamePath}\``));
          }
        }

        return curr;
      }, '');

    console.log('\n');
    spinner.succeed('清理完成');
  },
};

export default InitCmd;
