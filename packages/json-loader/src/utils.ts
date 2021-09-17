import fs from 'fs';
import path from 'path';
import { CachedFunction, IWeappAppConfig, IWeappSubPackage } from '@weapp-toolkit/weapp-types';
import { WeappConfigType } from './types';

let appCacheJson: IWeappAppConfig;

/**
 * 获取 JSON 配置文件的类型
 * @param appPath app路径
 * @param json
 * @returns `undefined` | `'page'` | `'component'` | `'app'`
 */
export const getConfigJsonType = (appPath: string, sourcePath: string): WeappConfigType | void => {
  /**
   * 传入的可能是 app.js，我们需要找到对应的 app.json
   */
  const appJsonPath = path.join(path.dirname(appPath), 'app.json');
  /** 当前文件和 app.json 文件路径一致 */
  if (appJsonPath === sourcePath) {
    return 'app';
  }
  /**
   * @description
   * 判断是否为page类型
   * 需要判断app.json中的pages、subpackages，如果匹配当前的文件路径，则类型为page
   */
  const { pages, subpackages, subPackages } = getAppJson(appJsonPath);
  const subPages = getSubpackagesPathList(subpackages || subPackages || []);
  const allPages = pages.concat(subPages);
  const page = allPages.find((pageName) => {
    return sourcePath.indexOf(pageName) !== -1;
  });
  if (page) {
    return 'page';
  }
};

/**
 * @description
 * @param appJsonPath app.json路径
 * 获取app.json内容，并做缓存
 */
export const getAppJson = (appJsonPath: string): IWeappAppConfig => {
  if (appCacheJson) {
    return appCacheJson;
  }
  const appJsonStr = fs.readFileSync(appJsonPath, 'utf-8');
  appCacheJson = JSON.parse(appJsonStr) as IWeappAppConfig;
  return appCacheJson;
};

/**
 * @description
 * 获取分包页面路径列表
 */
export const getSubpackagesPathList = (subpackages: IWeappSubPackage[]): string[] => {
  return subpackages.reduce((acc: string[], subpackage) => {
    const subpackagePathList = subpackage.pages.map((page) => {
      return path.join(subpackage.root, page);
    });
    acc = [...acc, ...subpackagePathList];
    return acc;
  }, []);
};
