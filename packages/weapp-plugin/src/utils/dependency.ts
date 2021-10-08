import { Compiler, EntryPlugin } from 'webpack';
import fsx from 'fs-extra';
import path from 'path';
import { IWeappComponentConfig, IWeappPageConfig } from '@weapp-toolkit/weapp-types';

/**
 * 添加模块依赖
 * @param compiler
 * @returns {Function}
 *  @param context
 *  @param entryPath
 *  @param chunkName
 */
export const addEntryFactory =
  (compiler: Compiler) =>
  (context: string, entry: string, options: EntryPlugin['options']): void => {
    new EntryPlugin(context, entry, options).apply(compiler);
  };

/**
 * 获取 page、component JSON 配置文件内的依赖
 * @param jsonPath json 配置文件路径
 */
export const getPageOrComponentDependencies = (jsonPath: string): string[] => {
  const json: IWeappPageConfig | IWeappComponentConfig = fsx.readJSONSync(jsonPath);
  const { usingComponents = {} } = json;

  return Object.values(usingComponents);
};

/**
 * 获取 page、component 的 wxml、css、wxs、json 等同名资源
 * @param context 文件夹绝对路径
 * @param basename 无扩展名文件名
 */
export const getPageOrComponentAssets = (context: string, basename: string): string[] => {
  const files = fsx.readdirSync(context);
  return files.filter((file) => path.basename(file) === basename);
};

/**
 * 判断 pathname 是否包含在分包路径内
 * @param pathname 文件路径
 * @param packageRoot
 * @returns boolean
 */
export function isInSubPackage(pathname: string, packageRoot: string) {
  return pathname.startsWith(packageRoot);
}
