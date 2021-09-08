import { CommandConfig } from '../@types/common';

interface PageOptionType {
  pathname: string | undefined;
  language?: string;
}

const PageCmd: CommandConfig = {
  description: '在指定分包或页面生成 page',
  argument: '[name]',
  options: [
    {
      flags: '-p,--pathname <pathname>',
      desc: '指定分包页面路径，对应 app.json 中分包别名或路径加上页面名称，如 pages/my',
    },
    {
      flags: '-l,--language <language>',
      desc: '指定语言，默认读取配置文件 language 项',
    },
  ],
  action: async (args, option, ctx) => {
    const addPage = require('../libs/add-page').default;
    const name = args[0] || '';
    const { pathname = '', language } = option as PageOptionType;

    await addPage(ctx, {
      name,
      pathname,
      language,
    });
  },
};

export default PageCmd;
