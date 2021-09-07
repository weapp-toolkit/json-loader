import path from 'path';
import { WeappConfigType } from './types';
import { IWeappAppConfig, IWeappSubPackage } from '@weapp-toolkit/weapp-types';

import fs from 'fs';

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
  const { pages, subpackages = [] } = getAppJson(appJsonPath);
  const subPages = getSubpackagesPathList(subpackages);
  const allPages = pages.concat(subPages);
  const page = allPages.find((page) => {
    return sourcePath.indexOf(page) !== -1;
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
  appCacheJson = (JSON.parse(appJsonStr)) as IWeappAppConfig;
  return appCacheJson;
};

/**
 * @description
 * 获取分包页面路径列表
 */
export const getSubpackagesPathList = (subpackages: IWeappSubPackage[] ): string[] => {
  return subpackages.reduce((acc: string[], subpackage) => {
    const subpackagePathList = subpackage.pages.map((page) => {
        return path.join(subpackage.root, page);
      });
    acc = [...acc, ...subpackagePathList];
    return acc;
  }, []);
};

export interface Entry {
  [key: string]: {
    import: string[]
  }
}
/**
 * getAppEntryPath
 * @param entry webpack entry
 * @description
 * 获取entry主入口文件路径
 */
export const getAppEntryPath = (entry: Entry): string => {
  /** 优先或取main,获取app */
  const main = entry.main || entry.app;
  if (main) {
    return main.import[0];
  } else {
    /** 取第一个 */
    const appKey = Object.keys(entry)[0];
    return entry[appKey].import[0];
  };
};
