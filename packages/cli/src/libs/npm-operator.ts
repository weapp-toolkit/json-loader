import semver from 'semver';
import chalk from 'chalk';

import spinner from '../utils/spinner';
import BaseGenerator from './base-generator.class';
import { ImpContext } from '../@types/config';
import Dependencies from './dependencies';
import { PackageListType, PackageMapType } from '../@types/libs/dependencies';

interface PropsType {
  operator: 'install' | 'uninstall' | 'remove';
  packageName?: string;
  packageNames?: string[];
  modules: string[];
  saveDev?: boolean;
}

class CreateGenerator extends BaseGenerator<PropsType> {
  ctx!: ImpContext;

  packageList!: PackageListType[];

  packageMap!: PackageMapType;

  dep!: Dependencies;

  constructor(ctx: ImpContext, props: PropsType) {
    super(ctx, props);

    this.ctx = ctx;
    Object.assign(this.props, props);

    this.dep = new Dependencies(ctx);
    this.packageList = this.dep.getPackageList('npm');
    this.packageMap = this.dep.getPackageMap('npm');
  }

  async prompting() {
    const { packageName, packageNames, operator } = this.props;
    const packageList = this.packageList.map(({ name }) => ({
      name,
      value: name,
    }));

    // 没指定
    if (operator !== 'remove' && packageName === undefined) {
      return;
    }
    // 没指定
    if (operator === 'remove' && packageNames === undefined) {
      return;
    }

    if (operator === 'remove') {
      await this.promptIfNotSet({
        name: 'packageNames',
        message: '在哪些分包下操作？',
        type: 'checkbox',
        choices: packageList,
        validate: (input: string[]) => {
          if (input) {
            const notMatch = input.filter((_input) => !this.packageMap[_input]);
            if (notMatch.length) {
              return `找不到包名为 ${notMatch.join(', ')} 的分包路径`;
            }
            return true;
          }
          return '请输入分包名';
        },
      });
      return;
    }

    await this.promptIfNotSet({
      name: 'packageName',
      message: '在哪个分包下操作？',
      type: 'list',
      choices: packageList,
      validate: (input: string) => {
        if (input) {
          const packagePath = this.packageMap[input];
          if (!packagePath) {
            return `找不到包名为 ${input} 的分包路径`;
          }
          return true;
        }
        return '请输入分包名';
      },
    });
  }

  async writing() {
    const { dep } = this;
    const { operator, packageName, modules, saveDev } = this.props;
    const _packageName = packageName || 'root';

    switch (operator) {
      case 'install': {
        spinner.info('开始安装 npm 依赖');
        await dep.install(_packageName, modules, saveDev);
        break;
      }
      case 'uninstall': {
        await dep.uninstall(_packageName, modules);
        break;
      }
      case 'remove': {
        dep.removeNodeModules(packageName ? packageName.split(',') : undefined);
        spinner.succeed('删除完成');
        break;
      }
      default:
        break;
    }
  }
}

export default (ctx: ImpContext, props: PropsType): Promise<void> => {
  if (!semver.satisfies(process.version, '>= 10.0.0')) {
    console.error(chalk.red('✘ The generator will only work with Node v10.0.0 and up!'));
    process.exit(1);
  }

  return new Promise((resolve) => {
    new CreateGenerator(ctx, props).run(resolve);
  });
};
