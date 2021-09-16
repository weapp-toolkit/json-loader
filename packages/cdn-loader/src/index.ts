import { LoaderContext, AssetInfo } from 'webpack';
import { getOptions, interpolateName } from 'loader-utils';
import { validate } from 'schema-utils';
import { JSONSchema7 } from 'json-schema';
import path from 'path';

import { normalizePath } from './util';
import schema from './options';

export interface JsonLoaderOptions {
  /** cdn 路径 */
  cdn?: string;
  /** 是否为 esModule */
  esModule?: boolean;
  /** output 输出路径 */
  output?: string;
  /** 文件名称 */
  filename?: string;
}

/**
 * @description
 * 处理资源文件路径，转为cdn路径
 *
 * @param this
 * @param source
 * @returns
 */
function loader(this: LoaderContext<JsonLoaderOptions>, source: Buffer): Buffer | string {
  const options = getOptions(this) as JsonLoaderOptions;

  validate(schema as JSONSchema7, options, {
    name: 'Cdn Loader',
    baseDataPath: 'options',
  });

  /** cdn不存在则不处理 */
  if (!options.cdn) {
    return source;
  }

  const { cdn, output = '', filename = '[name]-[contenthash:8].[ext]', esModule } = options;
  const { rootContext } = this;

  const name = interpolateName(this, filename, {
    content: source,
  });

  /**
   * @description
   * 文件输出路径，实际的文件系统写入路径
   */
  const fileOutputPath = path.join(output, name);

  /**
   * @description
   * 文件的cdn访问路径拼接
   */
  const fileCdnUrl = cdn.endsWith('/') ? `${cdn}${filename}` : `${cdn}/${filename}`;

  /**
   * @description assetInfo
   */
  const assetInfo: AssetInfo = {
    immutable: true,
    sourceFilename: normalizePath(path.relative(rootContext, this.resourcePath)),
  };
  /**
   * @description
   * webpack文件写入
   */
  this.emitFile(fileOutputPath, source, undefined, assetInfo);

  /** 导出该文件路径 */
  const result = esModule ? `export default '${fileCdnUrl}'` : `module.exports = '${fileCdnUrl}'`;
  console.log('[cdn-loader], result', result);
  return result;
}

export default loader;

export const raw = true;
