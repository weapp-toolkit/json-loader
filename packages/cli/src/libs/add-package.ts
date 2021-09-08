import semver from 'semver';
import chalk from 'chalk';
import path from 'path';

import BaseGenerator from './base-generator.class';
import { ImpConfig, ImpContext } from '../@types/config';
import Dependencies from './dependencies';
import addPage from './add-page';
import { PackageAliasType, PackageListType, PackageMapType, PackageType } from '../@types/libs/dependencies';
import {
  getCssFilename,
  getPackageNameAndPageNameFromPathname,
  modifyJsonFile,
  splitPackageNameAndPageNameFromPathname,
} from '../utils/helper';
import { AppJsonType } from '../@types/common';

interface PropsType {
  alias: string;
  pathname?: string;
  language?: string;
}

interface StateType {
  name: string;
  packageName: string;
  pageName: string;
  independent: boolean;
  multiPage: boolean;
  backgroundColor?: string;
  cssPreprocessor: ImpConfig['cssPreprocessor'];
}

class CreateGenerator extends BaseGenerator<PropsType & Partial<StateType>> {
  ctx!: ImpContext;

  packageList!: PackageListType[];

  packageMap!: PackageMapType;

  packageAliasMap!: PackageAliasType;

  constructor(ctx: ImpContext, props: PropsType) {
    super(ctx, props);

    this.ctx = ctx;
  }

  initializing() {
    const { props } = this;
    // 获取分包信息
    const dep = new Dependencies(this.ctx);
    this.packageList = dep.getPackageList('page');
    this.packageMap = dep.getPackageMap('page');
    this.packageAliasMap = dep.getPackageAliasMap();

    // 根据命令行参数 pathname 获取分包名和页面名
    const pathname = props.pathname?.replace(/^\//, '') || '';
    const [packageName] = getPackageNameAndPageNameFromPathname(pathname, this.packageMap, this.packageAliasMap);

    if (packageName) {
      console.error(`此路径上已经存在分包了: ${packageName}`);
      process.exit(-1);
    }

    props.pathname = pathname;

    const [_packageName, _pageName] = splitPackageNameAndPageNameFromPathname(pathname);
    props.packageName = _packageName;
    props.pageName = _pageName;
    props.backgroundColor = this.ctx.config.pageDefaultConfig.backgroundColor || '';
    props.cssPreprocessor = this.ctx.config.cssPreprocessor;
  }

  async prompting() {
    await this.promptIfNotSet({
      name: 'pathname',
      message: '在哪个位置创建？（如 pages-xxx，pages/xxx）',
      type: 'input',
      validate: (input: string) => {
        if (!input) {
          return '请输入分包路径';
        }
        if (!/^[a-z][a-z\d-]*(\/[a-z][a-z\d-]*)*$/.test(input)) {
          return '分包路径格式错误（仅支持以英文小写字母开头、由英文小写字母、数字、斜线或中划线的组合）';
        }
        const [packageName] = getPackageNameAndPageNameFromPathname(input, this.packageMap, this.packageAliasMap);
        if (packageName) {
          return '此路径上已经存在分包了';
        }
        return true;
      },
    });
    const [_packageName, _pageName] = splitPackageNameAndPageNameFromPathname(this.props.pathname!);
    this.props.packageName = _packageName;
    this.props.pageName = _pageName;

    await this.promptIfNotSet({
      name: 'multiPage',
      message: '分包是否包含多个页面？（是则将根据路径生成页面）',
      type: 'confirm',
      default: true,
    });

    await this.promptIfNotSet({
      name: 'independent',
      message: '是否独立分包？',
      type: 'confirm',
      default: false,
    });

    await this.promptLanguageIfNotSet();
  }

  configuring() {}

  async writing() {
    const {
      pathname,
      packageName,
      pageName,
      type,
      language,
      independent,
      multiPage,
      typeInline,
      name,
      alias,
      cssPreprocessor,
    } = this.props;
    const { pageDefaultConfig } = this.ctx.config;
    const packageRoot: string = multiPage ? packageName! : pathname!.replace(/^\//, '');
    this.sourceRoot(this.templatePath(`${type}-${language}`, 'page'));
    this.destinationRoot(this.destinationPath(packageRoot));

    if (!multiPage) {
      this.props.name = 'index'; // 改为模板文件名
      this._generateJson([[Object.assign({ navigationBarTitleText: name }, pageDefaultConfig), 'index.json']]);
      this.copyFiles([
        [`index.${language}.tpl`, `index.${language}`],
        ['index.wxml.tpl', 'index.wxml'],
        ['index.css.tpl', getCssFilename('index', cssPreprocessor!)],
      ]);

      if (language === 'ts' && !typeInline) {
        this.copyFiles([['index.d.ts', 'index.d.ts']]);
      }
    }

    if (independent) {
      this._generateJson([[{ dependencies: {}, devDependencies: {} }, 'package.json']]);
    }

    // 更新 app.json 分包信息
    const appJsonPath = path.resolve(this.ctx.srcRoot, 'app.json');
    modifyJsonFile<AppJsonType>(appJsonPath, (o) => {
      const { subpackages } = o;
      const subPackageKey = subpackages ? 'subpackages' : 'subPackages';
      const sub: PackageType = {
        root: packageRoot,
        pages: multiPage ? [] : ['index'],
      };
      if (alias) {
        Object.assign(sub, { name: alias });
      }
      if (independent) {
        Object.assign(sub, { independent: true });
      }
      if (o[subPackageKey]) {
        o[subPackageKey]!.push(sub);
      } else {
        o.subPackages = [sub];
      }
    });

    if (multiPage) {
      await addPage(this.ctx, {
        name: pageName!,
        pathname: packageName!,
      });
    }
  }

  end() {}
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
