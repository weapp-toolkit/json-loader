/**
 * 是否匹配至少一项
 * @param regexps
 * @param value
 * @returns
 */
const hasMatchOne = (regexps: RegExp[], value: string) => {
  return regexps.some((reg) => reg.test(value));
};

/**
 * 是否忽略
 * @param ignores RegExp[]
 * @param value String
 * @returns boolean
 */
export const shouldIgnore = (ignores: RegExp[], value: string) => {
  return hasMatchOne(ignores, value);
};

/**
 * 是否包含
 * @param includes RegExp[]
 * @param value String
 * @returns boolean
 */
export const shouldInclude = (includes: RegExp[], value: string) => {
  return hasMatchOne(includes, value);
};
