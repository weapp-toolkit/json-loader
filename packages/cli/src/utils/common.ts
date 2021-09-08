type O = Record<string, any>;

/**
 * 是否是 null 或 undefined
 * @param x 变量
 */
export function isNullOrUndefined<T>(x: T | null | undefined): x is null | undefined {
  return x == null || x === undefined;
}

/**
 * 判断变量类型
 * @param o 变量
 * @param type JS 数据类型
 */
export const isTypeof = (o: any, type: string): boolean => {
  return Object.prototype.toString.call(o) === `[object ${firstLetterUppercase(type)}]`;

  function firstLetterUppercase(word: string) {
    return String(word).replace(/^\w/, (l) => {
      return l.toUpperCase();
    });
  }
};

/**
 * 转为数组
 * @param a 数组或值
 */
export const toArray = (a: any): Array<any> => {
  return Array.isArray(a) ? a : [a];
};

/**
 * 对象是否空
 * @param o 对象
 */
export const isEmpty = (o: O): boolean => {
  return Object.keys(o).length === 0;
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

export const debounce = (fn: any, time: number) => {
  let timer: number | null = null;

  return function (this: any, ...args: any[]) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, time);
  };
};
