import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { CachedInputFileSystem, ResolverFactory, Resolver } from 'enhanced-resolve';
import type { Compiler, Configuration } from 'webpack';
import $ from 'lodash';

/**
 * 模块路径解析器
 * @param resolveConfig webpack Compiler.options.resolve 对象
 * @param appRoot 小程序 app 根绝对路径，app.json 所在路径
 */
export class FileResolver {
  static TAG = 'FileResolver';

  private resolver: Resolver;

  private syncResolver: Resolver;

  private syncContextResolver: Resolver;

  public appRoot: string;

  constructor(resolveConfig: Configuration['resolve'], appRoot: string) {
    this.appRoot = appRoot;

    const webpackResolveOptions = $.omit(resolveConfig, ['plugins', 'fileSystem']);
    const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

    this.resolver = ResolverFactory.createResolver({
      extensions: ['.js', '.ts'],
      fileSystem: nodeFileSystem,
      ...webpackResolveOptions,
    });

    this.syncResolver = ResolverFactory.createResolver({
      extensions: ['.js', '.json'],
      useSyncFileSystemCalls: true,
      fileSystem: nodeFileSystem,
      ...webpackResolveOptions,
    });

    this.syncContextResolver = ResolverFactory.createResolver({
      useSyncFileSystemCalls: true,
      resolveToContext: true,
      fileSystem: nodeFileSystem,
      ...webpackResolveOptions,
    });
  }

  /**
   * 模块路径解析异步方法
   * @param context 文件夹
   * @param request 文件路径
   * @returns
   */
  public resolve = (context: string, request: string): Promise<string> => {
    this.checkInit();

    const { resolver } = this;

    return new Promise<string>((res, rej) => {
      resolver!.resolve({}, context, request, {}, (err, result) => (err || !result ? rej(err) : res(result)));
    }).catch((e) => {
      this.throwException('resolve', context, request, e);
      return '';
    });
  };

  /**
   * 模块路径解析同步方法
   * @param context 文件夹
   * @param request 文件路径
   * @returns
   */
  public resolveSync = (context: string, request: string): string => {
    this.checkInit();

    try {
      const res = this.syncResolver!.resolveSync({}, context, request);
      if (!res) {
        throw new Error(`找不到该文件：${request}, 查找路径：${context}.`);
      }
      return res;
    } catch (e) {
      this.throwException('resolveSync', context, request, e);
      return '';
    }
  };

  /**
   * 依赖路径解析
   * @description 绝对路径将根据 `appRoot` 为根路径进行查找
   * @param context 文件夹
   * @param pathname 文件路径
   */
  public resolveDependency = async (context: string, pathname: string): Promise<string> => {
    this.checkInit();

    const { appRoot, resolve } = this;

    if (isRelativePath(pathname)) {
      return (
        /** 别名路径或者 node_modules */
        this.resolve(context, pathname)
          /** 可能是没加 ./ 的相对路径 */
          .catch(() => resolve(context, legalizationPath(pathname)))
      );
    }

    /** 如果是绝对路径从小程序根路径开始找，失败则降级为系统路径 */
    return resolve(appRoot, `.${pathname}`).catch(() => resolve('/', pathname));
  };

  /**
   * 依赖路径解析同步方法
   * @description 绝对路径将根据 `appRoot` 为根路径进行查找
   * @param context 文件夹
   * @param pathname 文件路径
   */
  public resolveDependencySync = (context: string, pathname: string): string => {
    this.checkInit();

    const { appRoot, resolveSync } = this;

    if (isRelativePath(pathname)) {
      try {
        /** 别名路径或者 node_modules */
        return resolveSync(context, pathname);
      } catch (error) {
        /** 可能是没加 ./ 的相对路径 */
        return resolveSync(context, legalizationPath(pathname));
      }
    }

    /** 如果是绝对路径从小程序根路径开始找，并把路径转换为相对路径，失败则降级为系统路径 */
    try {
      return resolveSync(appRoot!, `.${pathname}`);
    } catch (error) {
      return resolveSync('/', pathname);
    }
  };

  /**
   * 查找文件夹绝对路径同步方法
   * @description 绝对路径将根据 `appRoot` 为根路径进行查找
   * @param context 文件夹
   * @param pathname 子文件夹路径
   */
  public resolveDir = (context: string, dirname: string): string => {
    this.checkInit();

    const { appRoot, syncContextResolver } = this;

    let res;
    if (isRelativePath(dirname)) {
      try {
        /** 别名路径或者 node_modules */
        res = syncContextResolver!.resolveSync({}, context, dirname);
      } catch (error) {
        /** 可能是没加 ./ 的相对路径 */
        res = syncContextResolver!.resolveSync({}, context, legalizationPath(dirname));
      }
    } else {
      try {
        /** 如果是绝对路径从小程序根路径开始找 */
        res = syncContextResolver!.resolveSync({}, appRoot, `.${dirname}`);
      } catch (error) {
        res = syncContextResolver!.resolveSync({}, '/', dirname);
      }
    }

    if (!res) {
      throw new Error(`找不到该文件夹：${dirname}, 查找路径：${context}，${appRoot}, /.`);
    }
    return res;
  };

  /**
   * 检查是否初始化
   */
  private checkInit() {
    if (!this.appRoot) {
      throw new Error('FileResolver not initialized, please invoke `init()` first!');
    }
  }

  /**
   * 错误抛出
   * @param name 函数名
   * @param context
   * @param request
   * @param e
   */
  private throwException(name: string, context: string, request: string, e: any) {
    throw new Error(
      `[${FileResolver.TAG}] Some error occurred in '${name}'.` +
        `\ncontext: ${chalk.green(context)}` +
        `\nrequest: ${chalk.yellow(request)}` +
        `\nstack: ${new Error().stack}` +
        `\n\n${e?.message}`,
    );
  }
}

/** 判断是否是相对路径 */
export function isRelativePath(pathname: string): boolean {
  return !path.isAbsolute(pathname);
}

/**
 * 合法化路径
 * @param pathname
 * @returns
 */
export function legalizationPath(pathname: string): string {
  if (path.isAbsolute(pathname) || pathname.startsWith('..')) {
    return pathname;
  }

  return `./${path.normalize(pathname)}`;
}

/**
 * 替换扩展名
 * @param pathname 路径
 * @param ext 扩展名（以 `.` 开头）
 * @returns
 */
export function replaceExt(pathname: string, ext: string): string {
  if (!ext.startsWith('.')) {
    throw new Error(`非法的扩展名: ${ext}, 必须以 '.' 开头`);
  }
  return pathname.replace(path.extname(pathname), ext);
}

/**
 * 移除扩展名
 * @param pathname 路径
 * @returns
 */
export function removeExt(pathname: string): string {
  return pathname.replace(path.extname(pathname), '');
}

/**
 * 去掉资源地址中的 ?xxx=xxx
 * @param request
 * @returns
 */
export function removeQuery(request: string): string {
  return request.replace(/\?.*$/, '');
}

/**
 * 处理 chunk name，将 / 转为 ~
 * @param chunkName
 */
export function encodeChunkName(chunkName: string): string {
  return chunkName.replace(/~/g, '-').replace(/\/$/, '').replace(/\//g, '~');
}

/**
 * 获取 app 入口文件路径
 * @param compiler
 * @returns {String} appPath
 */
export function resolveAppEntryPath(compiler: Compiler): string {
  const { entry } = compiler.options;
  let app;

  if ('app' in entry) {
    app = entry.app?.import?.[0];
  }

  if (!app) {
    throw new Error('找不到小程序入口文件 app.json');
  }

  return app;
}
