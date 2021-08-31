import { LoaderContext, AssetInfo } from 'webpack';
import { getOptions, interpolateName } from 'loader-utils';
import { validate } from 'schema-utils';
import { JSONSchema7 } from 'json-schema';
import path from 'path';

import { getFileBasePath, normalizePath } from './util';
import schema from './options.json';

export interface JsonLoaderOptions {
  esModule?: boolean;
  appPath?: string;
  outputPath?: string;
  name?: string;
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
  const { CDN_URL: cdnUrl } = process.env;
  console.info('[cdn-loader], cdnUrl:', cdnUrl);

  /** cdn不存在则不处理 */
  if (!cdnUrl) {
    return callback(null, source);
  }
  console.info('[cdn-loader], context1:', options.context, this.rootContext);

  const { context, appPath, outputPath, } = options;
  const { rootContext } = this;
  let name = '[name].[ext]';
  if (options.name) {
    name = options.name;
  } else if (appPath) {
    /** 获取文件的base路径 */
    name = getFileBasePath(appPath, this.resourcePath);
    // const filePath = getFileBasePath(appPath, this.resourcePath);
    // const pathList = filePath.split('/');
    // pathList.pop();
    // pathList.push(name);
    // name = pathList.join('/');
  }
  console.log('[cdn-loader], name', name);

  const filename = interpolateName(this, name, {
    context,
    regExp: options.regExp,
  });
  console.log('[cdn-loader], filename', filename);

  /**
   * @description
   * 文件输出路径，实际的文件系统写入路径
   */
  let fileOutputPath = filename;
  if (outputPath) {
    fileOutputPath = path.resolve(outputPath, filename);
  }
  console.log('[cdn-loader], fileOutputPath', fileOutputPath);

  /**
   * @description
   * 文件的cdn访问路径拼接
   */
  const fileCdnUrl = `${
    cdnUrl.endsWith('/')
      ? cdnUrl
      : `${cdnUrl}/`
  }${filename}`;
  console.log('[cdn-loader], fileCdnUrl', fileCdnUrl);


  /**
   * @description assetInfo
   */
  const assetInfo: AssetInfo = {};
  if (typeof name === 'string') {
    let normalizedName = name;

    const idx = normalizedName.indexOf('?');

    if (idx >= 0) {
      normalizedName = normalizedName.substr(0, idx);
    }

    const isImmutable = /\[([^:\]]+:)?(hash|contenthash)(:[^\]]+)?]/gi.test(
      normalizedName
    );

    if (isImmutable === true) {
      assetInfo.immutable = true;
    }
  }
  assetInfo.sourceFilename = normalizePath(
    path.relative(context || rootContext, this.resourcePath)
  );
  /**
   * @description
   * webpack文件写入
   */
  this.emitFile(fileOutputPath, source, undefined, assetInfo);

  /**
   * @description
   * webpack模块导出
   */
  const { esModule } = options;

  /** 导出该文件路径 */
  const result = `${ esModule ? 'export default' : 'module.exports ='} "${fileCdnUrl}"`;
  console.log('[cdn-loader], result:', result);
  return result;
}

export default loader;
