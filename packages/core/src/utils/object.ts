import { firstLetterUppercase } from './string';

type O = Record<string, any>;

/**
 * 是否是 null 或 undefined
 * @param x 变量
 */
 export function isNullable<T>(x: T | null | undefined): x is null | undefined {
  return x === null || x === undefined;
}

/**
 * 判断变量类型
 * @param o 变量
 * @param type JS 数据类型
 */
export const isTypeof = (o: any, type: string): boolean => {
  return Object.prototype.toString.call(o) === `[object ${firstLetterUppercase(type)}]`;
};

/**
 * 对象深赋值
 * @param o1 对象1
 * @param o2 对象2
 */
 export const deepAssign = <T extends O, P extends O>(o1: T, o2: P): T & P => {
  const o: O = o1;
  Object.keys(o2).forEach((key) => {
    if (isTypeof(o2[key], 'object') && o[key]) {
      o[key] = deepAssign(o[key], o2[key]);
    } else if (isTypeof(o2[key], 'array')) {
      o[key] = isTypeof(o[key], 'array') ? Array.from(new Set([...o[key], ...o2[key]])) : o2[key];
    } else {
      o[key] = o2[key];
    }
  });

  return o as T & P;
};
