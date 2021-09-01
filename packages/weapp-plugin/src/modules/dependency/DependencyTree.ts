import path from 'path';
import fsx from 'fs-extra';
import { IWeappAppConfig } from '@weapp-toolkit/weapp-types';
import { Compiler } from 'webpack';
import { encodeChunkName, Resolver } from '../../utils/resolver';
import { APP_CHUNK_NAME, CUSTOM_TAB_BAR_CONTEXT } from '../../utils/constant';
import { createDependencyTreeNode, DependencyTreeNode } from './DependencyTreeNode';

/**
 * 依赖树初始化选项
 */
export interface IDependencyTreeOptions {
  resolver: Resolver /** 路径解析器 */;
  context: string /** base 文件夹 */;
  app: string /** 入口文件 */;
  compiler: Compiler;
}

/**
 * 依赖树 chunk 定义
 */
export interface IDependencyTreeChunk {
  chunkName: string /** chunk 名 */;
  entries: Set<DependencyTreeNode> /** js 文件 */;
}

/** 依赖树 */
export class DependencyTree {
  public chunks: Record<string, IDependencyTreeChunk> = {};

  /** 模块路径解析工具 */
  public resolver: Resolver;

  /** 模块路径解析，不带扩展名默认解析 js、ts 文件 */
  public resolve: (pathname: string) => string;

  /** 小程序根文件夹 */
  public context: string;

  /** app 入口文件 */
  public app: string;

  /** app 额外资源文件 */
  public assets: Set<string> = new Set();

  public compiler: Compiler;

  constructor(options: IDependencyTreeOptions) {
    const { resolver, context, app, compiler } = options;
    this.resolver = resolver;
    this.resolve = resolver.resolveDependencySync.bind(null, context);
    this.context = context;
    this.app = app;
    this.compiler = compiler;
  }

  /**
   * 构建依赖树
   * @param callback 构建完成回调函数
   */
  public build(callback?: () => void): void {
    const { resolve } = this;
    const appJsonPath = resolve('app.json');
    const appJson: IWeappAppConfig = fsx.readJSONSync(appJsonPath);

    this.addAppChunk(appJson);
    callback?.();
  }

  /**
   * 获取 chunk 的 entries 数组
   * @param chunkName
   * @returns
   */
  public getChunkEntries(chunkName: string): string[] {
    const chunkEntries = this.chunks[chunkName];

    if (!chunkEntries || !chunkEntries.entries) {
      return [];
    }

    return Array.from(chunkEntries.entries).reduce((entries: string[], entry) => {
      return entries.concat(entry.getChildrenRecursive());
    }, []);
  }

  /**
   * 获取 chunk 的 assets 数组
   * @param chunkName
   * @returns
   */
  public getChunkAssets(chunkName: string): string[] {
    const chunkEntries = this.chunks[chunkName];

    if (!chunkEntries || !chunkEntries.entries) {
      return [];
    }

    return Array.from(chunkEntries.entries).reduce((entries: string[], entry) => {
      return entries.concat(entry.getAssetsRecursive());
    }, []);
  }

  /**
   * 添加 app chunk
   */
  private addAppChunk(appJson: IWeappAppConfig) {
    const { pages, usingComponents = {}, tabBar } = appJson;

    /** 添加 app.js */
    this.addToChunk(APP_CHUNK_NAME, this.app);
    /** 添加主包里的 pages */
    this.addAllToChunk(APP_CHUNK_NAME, pages);
    /** 添加主包使用的 components */
    this.addAllToChunk(APP_CHUNK_NAME, Object.values(usingComponents));
    /** 添加 TabBar */
    this.addTabBar(tabBar);
    /** 添加分包 chunk */
    this.addSubPackageChunk(appJson);
  }

  /**
   * 添加 TabBar
   */
  private addTabBar(tabBar: IWeappAppConfig['tabBar']) {
    if (!tabBar) {
      return;
    }

    const { custom, list = [] } = tabBar;

    /** 如果是自定义 TabBar，解析自定义 TabBar 文件夹依赖 */
    if (custom) {
      const tabBarEntryPath = this.resolve(CUSTOM_TAB_BAR_CONTEXT);
      this.addToChunk(APP_CHUNK_NAME, tabBarEntryPath);
    }

    /** 获取 TabBar 列表配置里的图标资源 */
    const assets = list.reduce((resources: string[], listItem) => {
      const { iconPath, selectedIconPath } = listItem;

      /** 可能存在图标也可能不存在 */
      if (iconPath) {
        resources.push(this.resolve(iconPath));
      }

      /** 可能存在选中态图标也可能不存在 */
      if (selectedIconPath) {
        resources.push(this.resolve(selectedIconPath));
      }

      return resources;
    }, []);

    this.addToAppAssets(assets);
  }

  /**
   * 添加分包 chunk
   */
  private addSubPackageChunk(appJson: IWeappAppConfig) {
    /** 两种字段在小程序里面都是合法的 */
    const subPackages = appJson.subpackages || appJson.subPackages || [];
    subPackages.map((subPackage) => {
      const { root, pages, independent } = subPackage;
      /** 获取分包根绝对路径，从小程序根路径开始查找 */
      const context = path.dirname(this.resolver.resolveDir('/', root));
      /** 根据分包路径生成 chunk name */
      const chunkName = encodeChunkName(root);
      /** 以分包根路径作为 context 生成 resolve 函数 */
      const resolve = this.resolver.resolveDependencySync.bind(null, context);

      /** 如果是独立分包，单独为一个 chunk，否则加入 app chunk */
      return this.addAllToChunk(independent ? chunkName : APP_CHUNK_NAME, pages, resolve);
    });
  }

  /**
   * 添加页面、组件依赖
   * @param chunkName
   * @param resources
   * @param resolve
   */
  private addAllToChunk(chunkName: string, resources: string[], resolve = this.resolve) {
    resources.map((resource) => {
      /** 获取 js 路径 */
      const resourcePath = resolve(resource);
      /** 添加到 chunk */
      this.addToChunk(chunkName, resourcePath);
    });
  }

  /**
   * 将文件添加到 chunk
   * @param chunkName chunk 名
   * @param resourcePath 资源绝对路径
   */
  private addToChunk(chunkName: string, resourcePath: string) {
    if (!this.chunks[chunkName]) {
      this.chunks[chunkName] = {
        chunkName,
        entries: new Set(),
      };
    }

    const dependencyTreeNode = createDependencyTreeNode({
      pathname: resourcePath,
      resolver: this.resolver,
    });
    dependencyTreeNode.build();

    this.chunks[chunkName].entries.add(dependencyTreeNode);
  }

  /**
   * 将文件添加到 assets
   * @param resources
   * @returns
   */
  private addToAppAssets(resources: string[]) {
    const { assets, resolve } = this;

    resources.map((resource) => {
      /** 获取 js 路径 */
      const resourcePath = resolve(resource);

      /** 添加到 assets */
      assets.add(resourcePath);
    });
  }
}
