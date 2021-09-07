import { Compiler, EntryPlugin } from 'webpack';
import fsx from 'fs-extra';
import path from 'path';
import { IWeappComponentConfig, IWeappPageConfig } from '@weapp-toolkit/weapp-types';
import globby from 'globby';

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

/** #will be removed */
type EntryType = Record<string, string>;

function shouldIgnore(filePath: string, ignores: RegExp[]) {
  return ignores.some((reg) => {
    return reg.test(filePath);
  });
}

/**
 * 获取未知后缀的 ts | js 文件
 */
function getEntryFile(filename: string) {
  let fileBasename = filename.replace(path.extname(filename), '');

  const entryFilePath = fsx.existsSync(`${fileBasename}.ts`) ? `${fileBasename}.ts` : `${fileBasename}.js`;
  if (fsx.existsSync(entryFilePath)) {
    return entryFilePath;
  }
  fileBasename = path.join(fileBasename, 'index');
  return fsx.existsSync(`${fileBasename}.ts`) ? `${fileBasename}.ts` : `${fileBasename}.js`;
}

export const getAllEntries = (srcRoot: string, ignore: string[] = []): EntryType => {
  //
  return globby
    .sync('**/*.wxml', {
      cwd: srcRoot,
      ignore,
    })
    .reduce((o: EntryType, entry) => {
      const entryName = entry.replace('.wxml', '');

      if (!fsx.existsSync(path.join(srcRoot, `${entryName}.json`))) {
        return o;
      }
      const entryFile = getEntryFile(path.join(srcRoot, entryName));
      o[entryName] = entryFile;
      return o;
    }, {});
};
