import fs from 'fs';
import path from 'path';
import { CachedInputFileSystem, ResolverFactory } from 'enhanced-resolve';
import { Compiler } from 'webpack';
import $ from 'lodash';

export type Resolver = ReturnType<typeof createResolver>;

/**
 * 创建模块路径解析器
 * @param compiler webpack Compiler 对象
 * @param appRoot 小程序 app 根绝对路径，app.json 所在路径
 * @returns {} { resolve, resolveSync, resolveDependency }
 */
export const createResolver = (compiler: Compiler, appRoot: string) => {
  const webpackResolveOptions = $.omit(compiler.options.resolve, ['plugins', 'fileSystem']);
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
        resolve(context, './' + path.join(pathname))
          .then((res) => res)
          /** 相对路径找不到则可能是 npm 包 */
          .catch(() => resolve(process.cwd(), pathname))
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
        return resolveSync(context, './' + path.join(pathname));
      } catch (error) {
        /** 相对路径找不到则可能是 npm 包 */
        return resolveSync(process.cwd(), pathname);
      }
    }

    /** 如果是绝对路径从小程序根路径开始找 */
    return resolveSync(appRoot, `.${pathname}`);
  };

  /**
   * 查找文件夹绝对路径同步方法
   * @param context 文件夹
   * @param pathname 子文件夹路径
   * @returns
   */
  const resolveDir = (context: string, pathname: string) => {
    let result = '';

    if (isRelativePath(pathname)) {
      result = path.resolve(context, pathname);
    } else {
      /** 如果是绝对路径从小程序根路径开始找 */
      result = path.resolve(appRoot, `.${pathname}`);
    }

    if (!fs.existsSync(result)) {
      throw new Error(`找不到该文件夹：${pathname}, 查找路径：${context}, ${appRoot}.`);
    }

    return result;
  };

  return {
    resolve,
    resolveSync,
    resolveDependency,
    resolveDependencySync,
    resolveDir,
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
  return pathname.replace(path.extname(pathname), ext);
};

/**
 * 移除扩展名
 * @param pathname 路径
 * @returns
 */
export const removeExt = (pathname: string): string => {
  return pathname.replace(path.extname(pathname), '');
};

/**
 * 处理 chunk name，将 / 转为 ~
 * @param chunkName
 */
export const encodeChunkName = (chunkName: string): string => {
  return chunkName.replace(/~/g, '-').replace(/\//g, '~');
};
