import fs from 'fs';
import path from 'path';
import { CachedInputFileSystem, ResolverFactory } from 'enhanced-resolve';
import type { Compiler, Configuration } from 'webpack';
import $ from 'lodash';

export type Resolver = ReturnType<typeof createResolver>;

/**
 * 创建模块路径解析器
 * @param compiler webpack Compiler 对象
 * @param appRoot 小程序 app 根绝对路径，app.json 所在路径
 * @returns {} { resolve, resolveSync, resolveDependency }
 */
export function createResolver(resolveConfig: Configuration['resolve'], appRoot: string) {
  const webpackResolveOptions = $.omit(resolveConfig, ['plugins', 'fileSystem']);
  const nodeFileSystem = new CachedInputFileSystem(fs, 4000);
  const resolver = ResolverFactory.createResolver({
    extensions: ['.js', '.ts'],
    fileSystem: nodeFileSystem,
    ...webpackResolveOptions,
  });
  const syncResolver = ResolverFactory.createResolver({
    extensions: ['.js', '.json'],
    useSyncFileSystemCalls: true,
    fileSystem: nodeFileSystem,
    ...webpackResolveOptions,
  });
  const syncContextResolver = ResolverFactory.createResolver({
    useSyncFileSystemCalls: true,
    resolveToContext: true,
    fileSystem: nodeFileSystem,
    ...webpackResolveOptions,
  });

  /**
   * 模块路径解析异步方法
   * @param context 文件夹
   * @param request 文件路径
   * @returns
   */
  const resolve = (context: string, request: string) => {
    return new Promise<string>((res, rej) => {
      resolver.resolve({}, context, request, {}, (err, result) => (err || !result ? rej(err) : res(result)));
    });
  };

  /**
   * 模块路径解析同步方法
   * @param context 文件夹
   * @param request 文件路径
   * @returns
   */
  const resolveSync = (context: string, request: string) => {
    const res = syncResolver.resolveSync({}, context, request);
    if (!res) {
      throw new Error(`找不到该文件：${request}, 查找路径：${context}.`);
    }
    return res;
  };

  /**
   * 依赖路径解析
   * @param context 文件夹
   * @param pathname 文件路径
   * @returns
   */
  const resolveDependency = async (context: string, pathname: string) => {
    if (isRelativePath(pathname)) {
      return (
        /** 别名路径或者 node_modules */
        resolve(context, pathname)
          /** 可能是没加 ./ 的相对路径 */
          .catch(() => resolve(context, legalizationPath(pathname)))
      );
    }

    /** 如果是绝对路径从小程序根路径开始找 */
    return resolve(appRoot, `.${pathname}`);
  };

  /**
   * 依赖路径解析同步方法
   * @param context 文件夹
   * @param pathname 文件路径
   * @returns
   */
  const resolveDependencySync = (context: string, pathname: string) => {
    if (isRelativePath(pathname)) {
      try {
        /** 别名路径或者 node_modules */
        return resolveSync(context, pathname);
      } catch (error) {
        /** 可能是没加 ./ 的相对路径 */
        return resolveSync(context, legalizationPath(pathname));
      }
    }

    /** 如果是绝对路径从小程序根路径开始找，并把路径转换为相对路径 */
    return resolveSync(appRoot, `.${pathname}`);
  };

  /**
   * 查找文件夹绝对路径同步方法
   * @param context 文件夹
   * @param pathname 子文件夹路径
   * @returns
   */
  const resolveDir = (context: string, dirname: string) => {
    let res;
    if (isRelativePath(dirname)) {
      try {
        /** 别名路径或者 node_modules */
        res = syncContextResolver.resolveSync({}, context, dirname);
      } catch (error) {
        /** 可能是没加 ./ 的相对路径 */
        res = syncContextResolver.resolveSync({}, context, legalizationPath(dirname));
      }
    } else {
      /** 如果是绝对路径从小程序根路径开始找 */
      res = syncContextResolver.resolveSync({}, appRoot, `.${dirname}`);
    }

    if (!res) {
      throw new Error(`找不到该文件夹：${dirname}, 查找路径：${context}，${appRoot}.`);
    }
    return res;
  };

  return {
    resolve,
    resolveSync,
    resolveDependency,
    resolveDependencySync,
    resolveDir,
  };
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
