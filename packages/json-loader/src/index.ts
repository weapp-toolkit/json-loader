import { LoaderContext } from 'webpack';
import { interpolateName } from 'loader-utils';
import { JSONSchema7 } from 'json-schema';
import { merge, replaceExt, resolveAppEntryPath } from '@weapp-toolkit/core';
import { IWeappAppConfig, IWeappPageConfig } from '@weapp-toolkit/weapp-types';
import { IWeappConfigJSON } from './types';
import { getConfigJsonType } from './utils';

export interface JsonLoaderOptions {
  emit?: boolean;
  preprocessor?: {
    app?: Partial<IWeappAppConfig>;
    page?: Partial<IWeappPageConfig>;
  };
}

const schema: JSONSchema7 = {
  type: 'object',
  properties: {
    emit: {
      type: 'boolean',
      default: false,
    },
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
  const options = this.getOptions(schema);
  const callback = this.async();

  const { emit = false, preprocessor = {} } = options;

  /** 处理结束时调用 */
  const end = (name: string, sourceObject: Record<any, any>) => {
    /** 输出到文件系统 */
    const value = JSON.stringify(sourceObject)
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');

    if (emit) {
      this.emitFile(name, value);
    }

    callback(null, value);
  };

  /** 将 source 转为 string 类型 */
  const sourceString = typeof source === 'string' ? source : source.toString();
  let json: Partial<IWeappConfigJSON>;

  try {
    json = JSON.parse(sourceString);
  } catch (e: any) {
    /** 打印错误，但不会中断编译 */
    console.error(new Error(`${this.resourcePath /** 资源绝对路径 */} 不是合法的 JSON 文件.`));
    callback(e);
    return;
  }

  /** loader-utils type 没更新和 webpack5 冲突 */
  const outputPath = interpolateName(this as any, '[name].[ext]', {
    sourceString,
  });

  /** 通过入口文件，找出 app.json 路径 */
  const appPath = resolveAppEntryPath(this._compiler!);
  /** app.json路径 */
  const appJsonPath = replaceExt(appPath, '.json');

  /** 获取 JSON 的类型 */
  const configJsonType = getConfigJsonType(appJsonPath, this.resourcePath);

  // console.info('[json-loader], json所属类型:', configJsonType);

  /** JSON 文件不是 app、分包、页面、组件类型，不处理 */
  if (!configJsonType) {
    return end(outputPath, json);
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

  end(outputPath, mixinJson);
}

export default loader;
