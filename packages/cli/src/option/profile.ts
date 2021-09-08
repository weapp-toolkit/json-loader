import spinner from '../utils/spinner';

import { OptionConfig } from '../@types/common';
import { Dependencies } from '../@types/libs/dependencies';

const ProfileOption: OptionConfig = {
  alias: 'P',
  description: '输出项目依赖到 dependencies.json',
  action: async (args, ctx) => {
    spinner.logWithSpinner('正在生成 dependencies.json');

    const Dep: Dependencies = require('../libs/dependencies').default;
    const dep = new Dep(ctx);
    dep.generateDependenciesMap();

    spinner.succeed('生成完成');
  },
};

export default ProfileOption;
