import { LoaderContext } from 'webpack';
import { getOptions, interpolateName } from 'loader-utils';
import { validate } from 'schema-utils';
import { JSONSchema7 } from 'json-schema';
import { merge } from '@weapp-toolkit/core';
import { IWeappAppConfig, IWeappPageConfig } from '@weapp-toolkit/weapp-types';
import { IWeappConfigJSON } from './types';
import { getConfigJsonType, getAppEntryPath, Entry } from './utils';

export interface JsonLoaderOptions {
  preprocessor?: {
    app?: Partial<IWeappAppConfig>;
    page?: Partial<IWeappPageConfig>;
  };
}

const schema: JSONSchema7 = {
  type: 'object',
  properties: {
    preprocessor: {
      type: 'object',
      properties: {
        app: {
          type: 'object',
        },
        page: {
          type: 'object',
        },
      },
    },
  },
};

/**
 * 微信小程序 json 解析器
 * 只处理 app、page、分包、component 的 json 依赖解析
 *
 * 功能：可给 json 增加默认配置
 *
 * @param this
 * @param source
 * @returns
 */
function loader(this: LoaderContext<JsonLoaderOptions>, source: string | Buffer): void {
  const options = getOptions(this) as JsonLoaderOptions;
  const callback = this.async();

  validate(schema, options);

  /** 将 source 转为 string 类型 */
  const sourceString = typeof source === 'string' ? source : source.toString();
  let json: Partial<IWeappConfigJSON>;

  try {
    json = JSON.parse(sourceString);
  } catch (e) {
    /** 打印错误，但不会中断编译 */
    console.error(new Error(`${this.resourcePath /** 资源绝对路径 */} is not a valid JSON.`));
    return;
  }

  const outputPath = interpolateName(this, '[name].[ext]', {
    sourceString,
  });

  const { preprocessor = {} } = options;

  /** 通过入口文件，找出 app.json 路径 */
  const entry = this._compiler?.options.entry as Entry;
  let appJsonPath = '';
  if (entry) {
    const entryFile = getAppEntryPath(entry);
    /** app.json路径 */
    appJsonPath = entryFile.replace(/\.(\w+)/, '.json');
  } else {
    return callback?.(null, source);
  }

  /** 获取 JSON 的类型 */
  const configJsonType = getConfigJsonType(appJsonPath, this.resourcePath);

  // console.info('[json-loader], json所属类型:', configJsonType);

  /** JSON 文件不是 app、分包、页面、组件类型，不处理 */
  if (!configJsonType) {
    return callback?.(null, source);
  }

  /** 将源文件和 loader 配置项配置进行混合 */
  let mixinJson = json;
  switch (configJsonType) {
    case 'app':
      mixinJson = preprocessor.app ? merge(json, preprocessor.app) : json;
      break;
    case 'page':
      mixinJson = preprocessor.page ? merge(json, preprocessor.page) : json;
      break;
    default:
      break;
  }

  /** 输出到文件系统 */
  this.emitFile(outputPath, JSON.stringify(mixinJson));
  return callback?.(null, source);
}

export default loader;
