import semver from 'semver';
import chalk from 'chalk';

import BaseGenerator from './base-generator.class';
import { ImpConfig, ImpContext } from '../@types/config';
import Dependencies from './dependencies';
import { PackageAliasType, PackageListType, PackageMapType } from '../@types/libs/dependencies';
import { getCssFilename, getPackageNameAndPageNameFromPathname } from '../utils/helper';

interface PropsType {
  name: string;
  pathname: string;
  language?: string;
}

interface StateType {
  packageName: string;
  pageName: string;
  cssPreprocessor: ImpConfig['cssPreprocessor'];
}

class CreateGenerator extends BaseGenerator<PropsType & Partial<StateType>> {
  ctx!: ImpContext;

  packageList!: PackageListType[];

  packageMap!: PackageMapType;

  constructor(ctx: ImpContext, props: PropsType) {
    super(ctx, props);

    this.ctx = ctx;
  }

  initializing() {
    const { props } = this;
    // 获取分包信息
    const dep = new Dependencies(this.ctx);
    this.packageList = dep.getPackageList('comp');
    this.packageMap = dep.getPackageMap('comp');
    const packageAliasMap: PackageAliasType = dep.getPackageAliasMap();

    // 根据命令行参数 pathname 获取分包名和页面名
    const [packageName, pageName] = getPackageNameAndPageNameFromPathname(
      props.pathname,
      this.packageMap,
      packageAliasMap,
    );

    props.packageName = packageName;
    props.pageName = pageName;
    props.cssPreprocessor = this.ctx.config.cssPreprocessor;
  }

  async prompting() {
    await this.promptIfNotSet({
      name: 'name',
      message: '输入组件名称（使用横线分割）',
      type: 'input',
      validate(input: string) {
        if (!input) {
          return '请输入组件名称';
        }
        if (!/^[a-z][a-z\d-]*$/.test(input)) {
          return '组件名称格式错误（仅支持以英文小写字母开头、由英文小写字母、数字或中划线的组合）';
        }
        return true;
      },
    });

    const packageList = this.packageList.map(({ name }) => ({
      name,
      value: name,
    }));

    await this.promptIfNotSet({
      name: 'packageName',
      message: '在哪个分包创建？',
      type: 'list',
      choices: packageList,
      validate: (input: string) => {
        if (input) {
          const packagePath = this.packageMap[input];
          if (!packagePath) {
            return `找不到包名为 ${input} 的分包`;
          }
          return true;
        }
        return '请选择分包';
      },
    });

    const { packageName } = this.props;
    const { pages } = this.packageMap[packageName!];

    // 这种情况表示包下有页面
    if (pages.length > 0) {
      const pagesList = pages.map((page) => ({
        name: page,
        value: page,
      }));
      pagesList.unshift({
        name: 'components',
        value: 'components',
      });

      await this.promptIfNotSet({
        name: 'pageName',
        message: '在哪个位置创建？',
        type: 'list',
        choices: pagesList,
        validate: (input: string) => {
          if (input) {
            if (pages.indexOf(input) < 0) {
              return `找不到名为 ${input} 的页面`;
            }
            return true;
          }
          return '请选择创建位置';
        },
      });
    }

    await this.promptLanguageIfNotSet();
  }

  writing() {
    const { packageName = '', pageName = '', type, language, name, typeInline, cssPreprocessor } = this.props;
    this.sourceRoot(this.templatePath(`${type}-${language}`, 'component'));
    this.destinationRoot(this.destinationPath(packageName, pageName, name));

    this.copyFiles([
      ['index.json', `${name}.json`],
      [`index.${language}.tpl`, `${name}.${language}`],
      ['index.wxml.tpl', `${name}.wxml`],
    ]);

    this.copyFiles([['index.css.tpl', getCssFilename(name, cssPreprocessor!)]]);

    if (language === 'ts' && !typeInline) {
      this.copyFiles([['index.d.ts', `${name}.d.ts`]]);
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
