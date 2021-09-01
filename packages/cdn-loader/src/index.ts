import { LoaderContext, AssetInfo } from 'webpack';
import { getOptions, interpolateName } from 'loader-utils';
import { validate } from 'schema-utils';
import { JSONSchema7 } from 'json-schema';
import path from 'path';
import fs from 'fs';

import { getFileBasePath, normalizePath } from './util';
import schema from './options.json';

export interface JsonLoaderOptions {
  cdn?: string;
  esModule?: boolean;
  appPath?: string;
  context?: string;
  regExp?: string;
}

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

  validate(schema as JSONSchema7, options, {
    name: 'Cdn Loader',
    baseDataPath: 'optios',
  });

  /** cdn不存在则不处理 */
  if (!options.cdn) {
    return callback(null, source);
  }
  console.info('[cdn-loader], context:', options.context, this.rootContext);

  const { context, appPath, cdn } = options;
  const { rootContext } = this;

  let name = '[name]-[hash].[ext]';
  if (appPath) {
    /** 获取文件的base路径 */
    const filePath = getFileBasePath(appPath, this.resourcePath);
    const pathList = filePath.split('/');
    pathList.pop();
    pathList.push(name);
    name = pathList.join('/');
  }

  const filename = interpolateName(this, name, {
    context: context,
    content: source,
    regExp: options.regExp,
  });

  /**
   * @description
   * 文件输出路径，实际的文件系统写入路径
   */
  const fileOutputPath = filename;

  /**
   * @description
   * 文件的cdn访问路径拼接
   */
  const fileCdnUrl = `${cdn.endsWith('/')? cdn : `${cdn}/`}${filename}`;

  /**
   * @description assetInfo
   */
  const assetInfo: AssetInfo = {
    immutable: true,
    sourceFilename: normalizePath(
      path.relative(context || rootContext, this.resourcePath)
    )
  };
  /**
   * @description
   * webpack文件写入
   */
  this.emitFile(fileOutputPath, fs.readFileSync(this.resourcePath), undefined, assetInfo);

  /**
   * @description
   * webpack模块导出
   */
  const { esModule } = options;

  /** 导出该文件路径 */
  const result = `${ esModule ? 'export default' : 'module.exports ='} "${fileCdnUrl}"`;
  console.log('[cdn-loader], result:', result);
  callback(null, result);
}

export default loader;
