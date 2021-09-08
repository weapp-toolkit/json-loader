import chalk from 'chalk';
import fsx from 'fs-extra';
import path from 'path';
import cp from 'child_process';
import watch from 'node-watch';
import GlobToRegExp from 'glob-to-regexp';
import spawn from 'cross-spawn';
import { CommandConfig } from '../@types/common';
import { debounce } from '../utils/common';

const DevCmd: CommandConfig = {
  description: '开发环境打包',
  action: async (args, option, ctx) => {
    const { srcRoot, config } = ctx;
    const gitHead = path.join(process.cwd(), '.git/HEAD');
    const ignorePatterns = config.ignore.map((g) => GlobToRegExp(g));
    let child: cp.ChildProcess | null = null;
    let watcher: fsx.FSWatcher | null = null;
    process.env.NODE_ENV = 'dev';

    const dev = () => {
      child = spawn('npx', ['gulp', 'dev'], {
        stdio: [0, 1, 2],
      });
    };

    const killChild = () => {
      if (child) {
        child.kill('SIGKILL');
        child = null;
      }
    };

    const processExit = () => {
      killChild();
      process.exit(0);
    };

    /* 监听 json 变化重载依赖 */
    const watchJson = debounce(() => {
      watcher = watch(
        path.join(srcRoot, '/'),
        {
          delay: 1500,
          recursive: true,
          filter: (filename, skip) => {
            if (/node_modules/.test(filename) || ignorePatterns.some((r) => r.test(filename))) {
              return skip;
            }
            if (/\.json/.test(filename) && !/package(-lock)?\.json/.test(filename)) {
              return true;
            }
            return skip;
          },
        },
        debounce(() => {
          /* 即使是 close 掉了，函数也早已加入到了 event loop
           * 这里如果 close 掉了，不希望继续执行
           */
          if (!watcher) {
            return;
          }
          console.log(chalk.yellow('\n检测到 json 修改，重载依赖...\n'));
          if (child) {
            child.kill();
            child = null;
          }
          dev();
        }, 500),
      );
    }, 3000);

    dev();
    watchJson();

    /* 不是 git 项目，不监听 */
    if (!fsx.existsSync(gitHead)) {
      return;
    }

    watch(
      gitHead,
      {
        delay: 1000,
      },
      async () => {
        console.log(chalk.yellow('\n检测到分支切换，执行重新构建...'), '\n');
        /* 切换分支的时候，停掉之前的 gulp 监听 */
        killChild();

        /* 停掉之前的 json 监听 */
        if (watcher) {
          watcher.close();
          watcher = null;
        }
        await spawn('npx', ['imp', '--clear'], {
          stdio: [0, 1, 2],
        });
        dev();
        watchJson();
      },
    );

    // 进程失败时杀掉子进程
    process.on('uncaughtException', processExit); // error
    process.on('exit', processExit); // exit
    process.on('SIGINT', processExit); // ctrl c
    process.on('SIGTERM', processExit); // kill
  },
};

export default DevCmd;
