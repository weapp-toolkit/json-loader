import { IWeappConfigJSON, WeappConfigType } from './types';

/**
 * 获取 JSON 配置文件的类型
 * @param json
 * @returns `undefined` | `'page'` | `'component'` | `'app'`
 */
export const getConfigJsonType = (json: Partial<IWeappConfigJSON>): WeappConfigType | void => {
  // 通过文件路径去 app.json 里面匹配是不是页面
  return 'page';
};
