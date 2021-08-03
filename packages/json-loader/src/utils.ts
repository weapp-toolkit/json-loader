import { IWeappConfigJSON, WeappConfigType } from './types';

/**
 * 获取 JSON 配置文件的类型
 * @param json
 * @returns `undefined` | `'page'` | `'component'` | `'app'`
 */
export const getConfigJsonType = (json: Partial<IWeappConfigJSON>): WeappConfigType | void => {
  if ('component' in json) {
    return json.component ? 'component' : 'page';
  }
  if ('pages' in json) {
    return 'app';
  }
  if ('navigationBarTitleText' in json) {
    return 'page'
  }
};
