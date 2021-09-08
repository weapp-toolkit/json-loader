/* eslint-disable no-irregular-whitespace */
import fsx from 'fs-extra';
import path from 'path';
import { program, Command } from 'commander';
import chalk from 'chalk';
import configLoader from './utils/configLoader';
import { getJsonFile, getSrcRoot } from './utils/helper';

import { ImpCliOptions, ImpConfig, ImpContext } from './@types/config';
import { CommandConfig, OptionConfig } from './@types/common';
import { Require } from './@types/tools';
import checkLatest from './checkLatest';
import initNpm from './utils/init-npm';

const { version } = require('../package.json');

program.version(version);

program.on('command:*', () => {
  console.error(`Invalid command: ${program.args.join(' ')}\nUse -h, --help for a list of available commands.`);
  process.exit(1);
});

export default class ImwebMpCli {
  public options: ImpCliOptions;

  public config: ImpConfig;

  public context: ImpContext;

  private checkLatestAsync: ReturnType<typeof checkLatest>;

  constructor() {
    const workspaceRoot = path.resolve('.');
    this.options = {
      cliPath: __dirname,
      workspaceRoot,
    };

    const config = configLoader(workspaceRoot);
    this.config = config;

    const mpRoot = path.resolve(workspaceRoot, config.baseDir);
    const USER_HOME = process.env.HOME || process.env.USERPROFILE || '/';
    const customConfigPath = path.resolve(USER_HOME, '.imp/custom-config.json');
    const customConfig = getJsonFile(customConfigPath);

    this.context = {
      cliPath: __dirname,
      mpRoot,
      srcRoot: getSrcRoot(mpRoot, config.srcRoot, { fallback: true }),
      distRoot: path.resolve(mpRoot, config.output),
      config,
      customConfigPath,
      customConfig,
      /** @TODO deprecated */
      npm: initNpm(config.npmRegistry /* customConfig */),
    };

    this.checkLatestAsync = checkLatest(this.context);
  }

  // 检查更新
  private async checkUpdate() {
    const check = await this.checkLatestAsync;

    if (check) {
      const { registry } = this.context.customConfig;
      const { latestVersion, currentVersion } = check;
      const _registry = registry ? ` --registry=${registry}` : '';
      console.log(
        `\n目前最新版本的 @tencent/imweb-miniprogram-cli 为：${chalk.green(latestVersion)}, 你的当前版本为：${chalk.red(
          currentVersion,
        )}`,
      );
      console.log(chalk.green(`升级命令：\`npm install -g @tencent/imweb-miniprogram-cli${_registry}\``));
      console.log(chalk.green(`　　　或：\`npm install -D @tencent/imweb-miniprogram-cli${_registry}\``));
    }
  }

  private loadCommands<T extends CommandConfig | OptionConfig>(pathname: string) {
    const { cliPath } = this.options;
    const cmdDirPath = path.resolve(cliPath, pathname);
    const files: string[] = fsx.readdirSync(cmdDirPath);
    const cmdList = files
      .filter((filepath) => /\.js$/.test(filepath))
      .map((filepath) => {
        const res: T = require(path.join(cmdDirPath, filepath)).default;
        const name = res.name || filepath.replace('.js', '');
        return Object.assign(res, { name });
      });

    return cmdList;
  }

  private createOption(option: Require<OptionConfig, 'name'>) {
    const { name, alias, description, argument, defaultValue, action } = option;
    const _alias = alias ? `-${alias},` : '';
    const _arg = argument ? ` ${argument}` : '';
    const flags = `${_alias} --${name}${_arg}`;

    program.option(flags, description, defaultValue);
    return { name, action };
  }

  private createCommand(option: Require<CommandConfig, 'name'>) {
    const { name, alias, description, argument, options, action, subCmd } = option;
    const cmd = new Command(name);
    cmd.description(description);

    if (alias) {
      cmd.alias(alias);
    }

    if (argument) {
      cmd.arguments(argument);
    }

    if (options) {
      options.forEach((opt) => {
        const { flags, desc, required, defaultValue } = opt;
        if (required) {
          cmd.requiredOption(flags, desc, defaultValue);
        } else {
          cmd.option(flags, desc, defaultValue);
        }
      });
    }

    cmd.action(async (...args: string[]) => {
      // 去掉最后一个 cmd 对象
      const _args = args.slice(0, -1);
      await action(_args, cmd.opts(), this.context);
      await this.checkUpdate();
    });

    if (subCmd?.length) {
      subCmd.forEach((sub) => {
        cmd.addCommand(this.createCommand(sub));
      });
    }

    return cmd;
  }

  private registerOptions() {
    const optionList = this.loadCommands<OptionConfig>('option');
    const optionActions = optionList.map((optionConfig) => {
      return this.createOption(optionConfig);
    });

    program.action(async () => {
      let triggeredAction: (() => Promise<void>) | undefined;

      optionActions.some(({ name, action }) => {
        if (program[name]) {
          triggeredAction = action.bind(this, program[name], this.context);
          return true;
        }
        return false;
      });
      if (!triggeredAction) {
        console.error(
          `error: invalid command: ${program.args.join(' ')}\nUse -h, --help for a list of available commands.`,
        );
        process.exit(1);
      }

      await triggeredAction();
      await this.checkUpdate();
    });
  }

  private registerCommands() {
    const cmdList = this.loadCommands<CommandConfig>('cmd');
    cmdList.forEach((cmdOption) => {
      const cmd = this.createCommand(cmdOption);
      program.addCommand(cmd);
    });
  }

  // 入口函数
  public async run(): Promise<void> {
    this.registerOptions();
    this.registerCommands();

    if (!process.argv.slice(2).length) {
      // 没有输入参数的时候输出帮助信息；为什么这里是 2，具体可以自己打印一下 process.argv 看看
      program.outputHelp((str) => {
        return `${str}\nHelps:\n  imp -h\n  imp <command> -h\n\n`;
      });
      return;
    }

    // 解析命令行参数
    program.parse(process.argv);
  }
}
