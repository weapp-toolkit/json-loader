import { CommandConfig } from '../@types/common';

interface SubPackageOptionType {
  alias?: string;
  language?: string;
}

const PageCmd: CommandConfig = {
  alias: 'pkg',
  description: '在指定位置生成分包，如 pages-report/study-report',
  argument: '[pathname]',
  options: [
    {
      flags: '-a <alias>',
      desc: '设置分包别名',
    },
    {
      flags: '-l,--language <language>',
      desc: '指定语言，默认读取配置文件 language 项',
    },
  ],
  action: async (args, option, ctx) => {
    const addSubPackage = require('../libs/add-package').default;
    const pathname = args[0] || '';
    const { alias = '', language } = option as SubPackageOptionType;

    await addSubPackage(ctx, {
      alias,
      pathname,
      language,
    });
  },
};

export default PageCmd;
