import chalk from 'chalk';
import { CommandConfig } from '../@types/common';
import { CustomConfig } from '../@types/config';
import { getJsonFile, modifyJsonFile } from '../utils/helper';

const validConfigItems = ['registry'];

const validateConfigKey = (key: string) => {
  if (validConfigItems.includes(key)) {
    return true;
  }
  console.error(
    `${chalk.red('Invalid config key')}\nYou can run \`imp config -h\` to see the available configuration items`,
  );
  return false;
};

const ConfigCmd: CommandConfig = {
  description: '查看配置项',
  argument: '<key>',
  options: [
    {
      flags: '-h',
      desc: '帮助',
    },
  ],
  // 查看配置的值
  action: async (args, option, ctx) => {
    if (!validateConfigKey(args[0])) {
      return;
    }

    const { customConfigPath } = ctx;
    const customConfig = getJsonFile<CustomConfig>(customConfigPath);
    // 帮助
    if (option.h) {
      console.log('可配置项：\n', validConfigItems.join(', '));
      return;
    }
    // 输出当前配置项的值
    console.log(customConfig[args[0]]);
  },
  subCmd: [
    {
      name: 'set',
      description: '设置配置项',
      argument: '<key> <value>',
      action: async (args, option, ctx) => {
        if (!validateConfigKey(args[0])) {
          return;
        }

        const { customConfigPath } = ctx;
        const [key, value] = args;

        modifyJsonFile<CustomConfig>(customConfigPath, (o) => {
          o[key] = value;
          return o;
        });
      },
    },
  ],
};

export default ConfigCmd;
