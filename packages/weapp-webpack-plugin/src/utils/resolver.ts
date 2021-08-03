import fs from 'fs';
import { CachedInputFileSystem, ResolverFactory } from 'enhanced-resolve';
import { Compiler } from 'webpack';
import $ from 'lodash';

export interface Resolver {
  /**
   * 模块路径解析异步方法
   * @param context 文件夹
   * @param request 文件路径
   */
  resolve: (context: string, request: string) => Promise<string | false>;
  /**
   * 模块路径解析同步方法
   * @param context 文件夹
   * @param request 文件路径
   */
  resolveSync: (context: string, request: string) => string | false;
}

/**
 * 创建模块路径解析器
 * @param compiler webpack Compiler 对象
 * @returns {} { resolve, resolveSync }
 */
export const createResolver = (compiler: Compiler) => {
  const webpackResolveOptions = $.omit(compiler.options.resolve, ['plugins', 'fileSystem']);
  const resolver = ResolverFactory.createResolver({
    extensions: ['.js', '.json'],
    fileSystem: new CachedInputFileSystem(fs, 4000),
    ...webpackResolveOptions,
  });

  const resolve = (context: string, request: string) => {
    return new Promise<string | false>((resolve, reject) => {
      resolver.resolve({}, context, request, {}, (err, res) => (err || res === undefined ? reject(err) : resolve(res)));
    });
  };

  const resolveSync = (context: string, request: string) => {
    return resolver.resolveSync({}, context, request);
  };

  return {
    resolve,
    resolveSync,
  };
};
