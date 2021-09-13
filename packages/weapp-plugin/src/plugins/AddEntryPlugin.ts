import path from 'path';
import { Compiler, EntryPlugin } from 'webpack';
import { createResolver, resolveAppEntryPath, Resolver } from '@weapp-toolkit/core';
import { APP_GROUP_NAME } from 'src/utils/constant';
import { addEntryFactory } from '../utils/dependency';
import { DependencyTree } from '../modules/dependencyTree';

/**
 * AddEntryPlugin 初始化选项
 */
export interface IAddEntryPluginOptions {
  ignore?: Array<string | RegExp> /** 忽略的文件（夹） */;
  dependencyTree: DependencyTree /** 依赖树实例 */;
}

/**
 * 冬天添加小程序 entry
 */
export class AddEntryPlugin {
  static PLUGIN_NAME = 'AddEntryPlugin';

  ignore: Array<string | RegExp>;

  /** 小程序项目根文件夹，app.json 所在目录 */
  context!: string;

  /** 模块路径解析器 */
  resolver!: Resolver;

  /** 依赖树 */
  dependencyTree: DependencyTree;

  /** 添加 entry 函数 */
  addEntry!: (entry: string, options: EntryPlugin['options']) => void;

  constructor(options: IAddEntryPluginOptions) {
    this.ignore = options.ignore || [];
    this.dependencyTree = options.dependencyTree;
  }

  apply(compiler: Compiler): void {
    const app = resolveAppEntryPath(compiler);

    this.context = path.dirname(app);
    this.resolver = createResolver(compiler, this.context);
    this.addEntry = addEntryFactory(compiler).bind(this, this.context);

    compiler.hooks.entryOption.tap(AddEntryPlugin.PLUGIN_NAME, () => {
      this.setAllEntries();
      return true;
    });
  }

  /**
   * 添加项目所有依赖
   */
  setAllEntries(): void {
    const modules = this.dependencyTree.getModules();

    modules.forEach((module) => {
      const { pathname, packageGroup, chunkName } = module;

      const option = { name: chunkName };

      if (!module.isAssets()) {
        Object.assign(option, {
          runtime:
            /** 和 runtime 生成位置有关，并让目录结构更好看 */
            packageGroup === APP_GROUP_NAME
              ? `${path.basename(packageGroup)}.runtime`
              : path.join(packageGroup, `${path.basename(packageGroup)}.runtime`),
        });
      }

      this.addEntry(pathname, option);
    });
  }
}
