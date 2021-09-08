import fsx from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { PackageType, PackageMapType, PackageListType, PackageAliasType } from '../@types/libs/dependencies';
import spinner from '../utils/spinner';
import { getPageName, writeJsonFile } from '../utils/helper';
import { AppJsonType } from '../@types/common';
import { ImpContext } from '../@types/config';

const ci = require('miniprogram-ci');

type AppPackageMapType = 'npm' | 'comp' | 'page';

/**
 * 处理 npm 和 分包 依赖关系的类
 */
export default class Dependencies {
  private ctx: ImpContext;

  private appJson!: AppJsonType;

  constructor(ctx: ImpContext) {
    this.ctx = ctx;
    this._loadAppJson();
  }

  private _loadAppJson = () => {
    const { srcRoot } = this.ctx;
    try {
      this.appJson = fsx.readJSONSync(path.resolve(srcRoot, 'app.json'));
    } catch (error) {
      console.log(chalk.yellow('\nWARNING: app.json file not found.'));
      this.appJson = { pages: [] };
    }
  };

  // 获取 app.json 分包数据
  private _getAppPackageMap = (type: AppPackageMapType) => {
    const { appJson } = this;

    const rootPages = appJson.pages || [];
    const packageList = appJson.subpackages || appJson.subPackages || [];
    const pkgMap: PackageMapType = {};

    switch (type) {
      case 'npm':
        pkgMap.root = {
          pathname: '.',
          pages: [],
        };
        break;
      case 'comp':
        pkgMap.components = {
          pathname: 'components',
          pages: [],
        };
        pkgMap.pages = {
          pathname: 'pages',
          pages: rootPages.map((p) => getPageName('pages', p)),
        };
        break;
      case 'page':
        pkgMap.pages = {
          pathname: 'pages',
          pages: rootPages.map((p) => getPageName('pages', p)),
        };
        break;
      default:
        break;
    }

    packageList.forEach((sub) => {
      const pathname = sub.root;
      pkgMap[sub.root] = {
        pathname,
        pages: sub.pages.map((p) => getPageName(sub.root, p)).filter((p) => p),
      };
    });

    return pkgMap;
  };

  // 获取传入目录下的 package.json 里的 dependencies
  private _getDependencies = (pkgPath: string) => {
    try {
      const o = fsx.readJSONSync(path.join(pkgPath, 'package.json'));
      return o.dependencies;
    } catch (error) {
      return {};
    }
  };

  /**
   * 写入 package.json (覆盖)
   * @param {string} pkgPath package.json 所在目录
   * @param {object} o  写入值
   */
  private _setPackageJson = (pkgPath: string, o: Record<string, unknown>) => {
    const filePath = path.resolve(pkgPath, 'package.json');
    writeJsonFile(filePath, o);
  };

  /**
   * 检查 package.json 是否存在
   * @param {string} pkgPath package.json 所在目录
   */
  private _hasPackageJson = (pkgPath: string) => {
    const filePath = path.resolve(pkgPath, 'package.json');
    return fsx.existsSync(filePath);
  };

  /**
   * 写入 package.json（如果该文件不存在的话）
   * @param {string} pkgPath package.json 所在目录
   * @param {object} o  写入值
   */
  private _createPackageJsonIfNotExist = (pkgPath: string, o: Record<string, unknown>) => {
    if (this._hasPackageJson(pkgPath)) {
      return;
    }
    this._setPackageJson(pkgPath, o);
  };

  /**
   * 在分包目录下进行 npm 包管理
   * @param {string} cmd
   * @param {string} pkgPath
   * @param {array?} modules
   * @param {boolean} saveDev
   */
  private _operateDependencies = async (cmd: string, pkgPath: string, modules: string[], saveDev?: boolean) => {
    const { npm } = this.ctx;
    if (saveDev) {
      // 跑 npm 命令
      await npm([cmd, '--save-dev', ...modules], { cwd: pkgPath });
    } else {
      // 跑 npm 命令
      await npm([cmd, ...modules], { cwd: pkgPath });
    }
  };

  /**
   * 删除文件
   * @param {string} filepath
   * @param {function} callback
   */
  private _removeFile(filepath: string, callback?: () => void) {
    if (!fsx.existsSync(filepath)) {
      return;
    }
    fsx.removeSync(filepath);
    if (callback) {
      callback();
    }
  }

  /**
   * 构建 npm 包
   */
  private _buildNpmPackages = async (pkgPath: string) => {
    const result = await ci.packNpmManually({
      packageJsonPath: path.resolve(this.ctx.srcRoot, pkgPath, 'package.json'),
      miniprogramNpmDistDir: path.resolve(this.ctx.distRoot, pkgPath),
    });
    console.log(result);
  };

  public getPackageList = (type: AppPackageMapType): PackageListType[] => {
    const packageMap = this._getAppPackageMap(type);
    const packageList = Object.keys(packageMap).map((name) => {
      const { pathname, pages } = packageMap[name];
      return {
        name,
        pathname,
        pages,
      };
    });
    return packageList;
  };

  public getPackageMap = (type: AppPackageMapType): PackageMapType => this._getAppPackageMap(type);

  // 获取分包别名映射
  public getPackageAliasMap = (): PackageAliasType => {
    const { appJson } = this;
    const packageList: PackageType[] = appJson.subpackages || appJson.subPackages || [];
    const packageAliasMap: PackageAliasType = {};

    packageList.forEach((sub) => {
      if (sub.name) {
        packageAliasMap[sub.name] = sub.root;
      }
    });

    return packageAliasMap;
  };
  // // 获取分包下的 page 路径
  // public getPackagePagesPath = (packagePath: string): string[] => {
  //   const packageMap =
  // }

  /**
   * 生成 dependencies.json
   */
  public generateDependenciesMap = (): void => {
    const packageMap = this._getAppPackageMap('npm');

    Object.keys(packageMap).forEach((packageName) => {
      const packagePath = path.resolve(this.ctx.srcRoot, packageMap[packageName].pathname);
      const dependencies = this._getDependencies(packagePath);
      packageMap[packageName].dependencies = dependencies;
    });

    writeJsonFile(path.resolve(this.ctx.mpRoot, 'dependencies.json'), packageMap);
  };

  /**
   * 构建所有 node_modules
   */
  public buildNpm = async (): Promise<void> => {
    const queue = this.getPackageList('npm');

    for (let i = 0; i < queue.length; i++) {
      const { pathname } = queue[i];
      const pkgPath = path.resolve(this.ctx.srcRoot, pathname);

      // 过滤掉没有 package.json 的分包
      if (!this._hasPackageJson(pkgPath)) {
        continue;
      }

      spinner.info(`在 ${pkgPath} 构建 npm 包`);

      // 构建 npm 包
      // eslint-disable-next-line no-await-in-loop
      await this._buildNpmPackages(pathname); // dist 和 src 路径不同，这里要相对路径来拼接
    }
  };

  /**
   * 在指定位置安装 npm 包
   * @param {string} packageName 分包名
   * @param {array} modules npm 包名
   */
  public install = async (
    packageName: string,
    modules: string[] | undefined = [],
    saveDev?: boolean,
  ): Promise<void> => {
    const packageMap = this._getAppPackageMap('npm');
    if (modules.length) {
      packageName = packageName || 'root';
    } else {
      packageName = '';
    }

    const queue = [];
    // 指定分包安装
    if (packageName) {
      queue.push(packageName);
      // 初始化安装
    } else {
      queue.push(...Object.keys(packageMap));
    }

    for (let i = 0; i < queue.length; i++) {
      const pkgName = queue[i];
      const pkgInfo = packageMap[pkgName];

      if (!pkgInfo) {
        spinner.fail(`不存在分包名或别名为 ${pkgName} 的分包.\n`);
        continue;
      }

      const pkgPath = path.resolve(this.ctx.srcRoot, pkgInfo.pathname);

      // 默认安装情况下，过滤掉没有 package.json 的分包
      if (!packageName && !this._hasPackageJson(pkgPath)) {
        continue;
      }

      spinner.info(`在 ${pkgPath} 安装 npm 包\n`);

      this._createPackageJsonIfNotExist(pkgPath, { dependencies: {} });
      // eslint-disable-next-line no-await-in-loop
      await this._operateDependencies('install', pkgPath, modules, saveDev);

      if (!saveDev) {
        // 构建 npm 包
        // eslint-disable-next-line no-await-in-loop
        await this._buildNpmPackages(pkgInfo.pathname); // dist 和 src 路径不同，这里要相对路径来拼接
      }
    }
    spinner.succeed('安装完成');
  };

  /**
   * 在指定位置卸载 npm 包
   * @param {string} packageName 分包名
   * @param {array} modules 包名
   */
  public uninstall = async (packageName: string, modules: string[]): Promise<void> => {
    if (!packageName) {
      return spinner.fail('`packageName`不能为空\n');
    }

    const packageMap = this._getAppPackageMap('npm');
    const pkgInfo = packageMap[packageName];

    if (!pkgInfo) {
      return spinner.fail(`packageName: ${packageName} 不存在.\n`);
    }

    const pkgPath = pkgInfo.pathname;

    await this._operateDependencies('uninstall', path.resolve(this.ctx.srcRoot, pkgInfo.pathname), modules);

    const miniNpmPath = path.resolve(pkgPath, 'miniprogram_npm');
    this._removeFile(miniNpmPath);
    this._buildNpmPackages(pkgPath);
    spinner.succeed('卸载完成');
  };

  /**
   * 删除分包下的 node_modules 和 miniprogram_npm
   * @param {array} pkgNames
   */
  public removeNodeModules = (pkgNames: string[] | undefined = []): void => {
    const packageMap = this._getAppPackageMap('npm');
    const pkgList = pkgNames.length === 0 ? Object.keys(packageMap) : pkgNames;

    pkgList.forEach((pkgName) => {
      const pkgInfo = packageMap[pkgName];
      if (!pkgInfo) {
        return spinner.fail(`不存在名为 ${pkgName} 的分包.`);
      }

      const nodeModulePath = path.resolve(path.resolve(this.ctx.srcRoot, pkgInfo.pathname), 'node_modules');
      const miniNpmPath = path.resolve(path.resolve(this.ctx.distRoot, pkgInfo.pathname), 'miniprogram_npm');
      this._removeFile(nodeModulePath, () => {
        spinner.succeed(`已删除 ${nodeModulePath}`);
      });
      this._removeFile(miniNpmPath, () => {
        spinner.succeed(`已删除 ${miniNpmPath}`);
      });
    });
  };
}
