import { CommandConfig } from '../@types/common';

const PublishCmd: CommandConfig = {
  description: '将代码上传到小程序后台',
  argument: '[version]',
  options: [
    {
      flags: '-d,--desc <description>',
      desc: '发布描述及备注',
    },
  ],
  action: async (args, option, ctx) => {
    const version = args[0];
    const { description } = option;

    const publish = require('../libs/publish').default;
    await publish(ctx, { version, description });
  },
};

export default PublishCmd;
