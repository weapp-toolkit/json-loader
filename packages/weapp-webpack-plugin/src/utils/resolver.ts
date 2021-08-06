import fs from 'fs';
import path from 'path';
import { CachedInputFileSystem, ResolverFactory } from 'enhanced-resolve';
import { Compiler } from 'webpack';
import $ from 'lodash';

export interface Resolver {
  /**
   * 模块路径解析异步方法
   * @param context 文件夹
   * @param request 文件路径
   */
  resolve: (context: string, request: string) => Promise<string>;
  /**
   * 模块路径解析同步方法
   * @param context 文件夹
   * @param request 文件路径
   */
  resolveSync: (context: string, request: string) => string;
  /**
   * 依赖路径解析
   * @param context 文件夹
   * @param pathname 文件路径
   * @returns
   */
  resolveDependency: (context: string, pathname: string) => Promise<string>;
}

/**
 * 创建模块路径解析器
 * @param compiler webpack Compiler 对象
 * @param appRoot 小程序 app 根绝对路径，app.json 所在路径
 * @returns {} { resolve, resolveSync, resolveDependency }
 */
export const createResolver = (compiler: Compiler, appRoot: string): Resolver => {
  const webpackResolveOptions = $.omit(compiler.options.resolve, ['plugins', 'fileSystem']);
  const resolver = ResolverFactory.createResolver({
    extensions: ['.js', '.ts'],
    fileSystem: new CachedInputFileSystem(fs, 4000),
    ...webpackResolveOptions,
  });

  /**
   * 模块路径解析异步方法
   * @param context 文件夹
   * @param request 文件路径
   * @returns
   */
  const resolve = (context: string, request: string) => {
    return new Promise<string>((resolve, reject) => {
      resolver.resolve({}, context, request, {}, (err, res) => (err || !res ? reject(err) : resolve(res)));
    });
  };

  /**
   * 模块路径解析同步方法
   * @param context 文件夹
   * @param request 文件路径
   * @returns
   */
  const resolveSync = (context: string, request: string) => {
    const res = resolver.resolveSync({}, context, request);
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
        resolve(context, path.join('./', pathname))
          .then((res) => res)
          /** 相对路径找不到则可能是 npm 包 */
          .catch(() => resolve(process.cwd(), pathname))
      );
    }

    /** 如果是绝对路径从小程序根路径开始找 */
    return resolve(appRoot, `.${pathname}`);
  };

  return {
    resolve,
    resolveSync,
    resolveDependency,
  };
};

/** 判断是否是相对路径 */
export function isRelativePath(pathname: string): boolean {
  return !path.isAbsolute(pathname);
}

/**
 * 替换扩展名
 * @param pathname 路径
 * @param ext 扩展名（以 `.` 开头）
 * @returns
 */
export const replaceExt = (pathname: string, ext: string): string => {
  if (!ext.startsWith('.')) {
    throw new Error(`非法的扩展名: ${ext}, 必须以 '.' 开头`);
  }
  return pathname.replace(/\.\w+$/, ext);
};

/**
 * 处理 chunk name，将 / 转为 ~
 * @param chunkName
 */
export const encodeChunkName = (chunkName: string): string => {
  return chunkName.replace(/~/g, '-').replace(/\//g, '~');
};
