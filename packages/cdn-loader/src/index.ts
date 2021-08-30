import { LoaderContext } from 'webpack';
import { getOptions, interpolateName } from 'loader-utils';
import { validate } from 'schema-utils';
import { JSONSchema7 } from 'json-schema';
import path from 'path';

import { getFileBasePath } from './util';

export interface JsonLoaderOptions {
  esModule?: boolean;
  appPath?: string;
}

const schema: JSONSchema7 = {
  type: 'object',
  properties: {
    esModule: {
      type: 'boolean',
    },
    appPath: {
      type: 'string',
    },
  },
};

/**
 * @description
 * 处理资源文件路径，转为cdn路径
 *
 * @param this
 * @param source
 * @returns
 */
function loader(this: LoaderContext<JsonLoaderOptions>, source: string | Buffer): void | string {
  const options = getOptions(this) as JsonLoaderOptions;
  const callback = this.async();

  validate(schema, options);

  const { appPath, esModule } = options;
  /** cdn不存在则不处理 */
  const { CDN_URL } = process.env;
  console.info('[cdn-loader], CDN_URL:', CDN_URL);

  if (!CDN_URL || !appPath) {
    return callback(null, source);
  }

  console.info('[cdn-loader], options:', options, this.resourcePath);
  console.info('[cdn-loader], appPath:', appPath);
  console.info('[cdn-loader], resourcePath:', this.resourcePath);
  /** 将 source 转为 string 类型 */
  const sourceString = typeof source === 'string' ? source : source.toString();
  const outputPath = interpolateName(this, '[name].[ext]', {
    sourceString,
  });
  console.info('[cdn-loader], outputPath:', outputPath);
  /** 写入文件系统 */
  this.emitFile(outputPath, sourceString);


  /** 获取文件的cdn路径 */
  const fileBasePath = getFileBasePath(appPath, this.resourcePath);
  const fileCdnUrl = path.join(CDN_URL, fileBasePath);

  /** 导出该文件路径 */
  const result = `${ esModule ? 'export default' : 'module.exports ='} "${fileCdnUrl}"`;
  console.log('[cdn-loader], fileCdnUrl: ', result);
  console.log('[cdn-loader], result:', result);
  return result;
}

export default loader;
