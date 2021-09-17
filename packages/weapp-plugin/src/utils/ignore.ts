/**
 * 是否忽略
 * @param ignores RegExp[]
 * @param value String
 * @returns boolean
 */
export const shouldIgnore = (ignores: RegExp[], value: string) => {
  return ignores.some((ignore) => ignore.test(value));
};
