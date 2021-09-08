import path from 'path';
import fsx from 'fs-extra';
import dotenv from 'dotenv';
import { deepAssign } from './common';
import { ImpConfig } from '../@types/config';
import { getPrivateKeyPath } from './helper';

const defaultConfig: ImpConfig = {
  type: 'native',
  language: 'ts',
  appId: '',
  srcRoot: 'src',
  privateKeyPath: '',
  baseDir: '.',
  output: 'dist',
  ignore: [],
  whitelist: [],
  clearIgnore: ['**/miniprogram_npm/**'],
  cssPreprocessor: 'postcss',
  typeInline: true,
  pageDefaultConfig: {
    usingComponents: {},
  },
  paths: {},
  babelrc: {},
  npmRegistry: 'http://r.tnpm.oa.com',
};

export default (workspaceRoot: string): ImpConfig => {
  dotenv.config();
  const filePath = path.resolve(workspaceRoot, 'imp.config.js');
  if (fsx.existsSync(filePath)) {
    const config: Partial<ImpConfig> = require(filePath);
    if (!config.privateKeyPath) {
      config.privateKeyPath = getPrivateKeyPath(path.join(workspaceRoot, config.baseDir || ''), true);
    }

    return deepAssign(defaultConfig, config);
  }
  return defaultConfig;
};
