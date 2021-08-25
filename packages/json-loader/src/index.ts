import { loader } from 'webpack';
import { getOptions } from 'loader-utils';
import { validate } from 'schema-utils';
import { JSONSchema7 } from 'json-schema';
import { merge } from '@weapp-toolkit/core';
import { IWeappAppConfig, IWeappPageConfig } from '@weapp-toolkit/weapp-types';
import { IWeappConfigJSON } from './types';
import { getConfigJsonType } from './utils';

export interface JsonLoaderOptions {
  preprocessor?: {
    app?: Partial<IWeappAppConfig>;
    page?: Partial<IWeappPageConfig>;
  }
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
      }
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
function loader(this: loader.LoaderContext, source: string | Buffer): void {
  const options = getOptions(this) as JsonLoaderOptions;
  const callback = this.async();

  validate(schema, options);

  /** 将 source 转为 string 类型 */
  const sourceString = typeof source === 'string' ? source : source.toString();
  let json: Partial<IWeappConfigJSON>;

  console.info('skr: loader options', options, this.resourcePath);

  try {
    json = JSON.parse(sourceString);
  } catch (e) {
    /** 打印错误，但不会中断编译 */
    this.emitError(new Error(`${this.resourcePath /** 资源绝对路径 */} is not a valid JSON.`));
    return;
  }

  /** 获取 JSON 的类型 */
  const configJsonType = getConfigJsonType(json);

  /** JSON 文件不是 app、分包、页面、组件类型，不处理 */
  if (!configJsonType) {
    return callback?.(null, source);
  }

  /** 将源文件和 loader 配置项配置进行混合 */
  const { preprocessor = {} } = options;
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

  /** 返回转为字符串后的 JSON */
  return callback?.(null, JSON.stringify(mixinJson));
}

export default loader;
