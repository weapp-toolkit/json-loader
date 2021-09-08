/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
import path from 'path';
import minimist from 'minimist';
import GlobToRegExp from 'glob-to-regexp';
import { getEntriesAndUnusedPaths } from '../../utils/entries';
import { ImpConfig } from '../../@types/config';

const knownOptions = {
  string: 'NODE_ENV',
  default: { NODE_ENV: process.env.NODE_ENV || 'production' },
};

const env = minimist(process.argv.slice(2), knownOptions);

const impConfig: ImpConfig = require(path.resolve(process.cwd(), 'imp.config.js'));
const srcRoot = path.join(impConfig.baseDir, impConfig.srcRoot);
const output = path.join(impConfig.baseDir, impConfig.output);
const defaultWhitelist = ['custom-tab-bar'];

const option = {
  cwd: path.resolve(process.cwd(), srcRoot),
  // allowEmpty: true,
};

const getEntriesWithComponentLibMode = () => {
  const { entries, unusedPaths } = getEntriesAndUnusedPaths(option.cwd, impConfig.ignore);

  /* 组件库模式下，不忽略未使用的文件 */
  if (impConfig.componentLib) {
    return { entries, unusedPaths: [] };
  }

  const whitelist = (impConfig.whitelist || defaultWhitelist).map((g) => GlobToRegExp(g));

  // 取消忽略白名单文件
  const filteredUnusedPaths = unusedPaths.filter((pattern) => !whitelist.some((include) => include.test(pattern)));

  return { entries, unusedPaths: filteredUnusedPaths };
};

const { entries, unusedPaths } = getEntriesWithComponentLibMode();

const ignores = unusedPaths
  .map((p) => path.join(p, '**'))
  .concat(impConfig.ignore || [])
  .map((i) => `!${i}`);

const ignoreNodeModules = ['!**/node_modules/**', '!**/miniprogram_npm/**'];

export { srcRoot, output, ignoreNodeModules, option, env, impConfig, entries, ignores };
