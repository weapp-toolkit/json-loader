import { loader } from 'webpack';
import { getOptions } from 'loader-utils';
import { validate } from 'schema-utils';
import { JSONSchema7 } from 'json-schema';
import { IWeappConfigJSON } from './types';

export interface JsonLoaderOptions {
  preprocessor: (config: Partial<IWeappConfigJSON>, type: string) => Partial<IWeappConfigJSON>
}

const schema: JSONSchema7 = {
  type: 'object',
  properties: {
    preprocessor: true,
  },
};

/**
 * 微信小程序 json 解析器
 * 只处理 app、page、分包、component 的 json 依赖解析
 *
 * @param this
 * @param source
 * @returns
 */
function loader(this: loader.LoaderContext, source: string | Buffer): void {
  const options = getOptions(this);

  validate(schema, options);

  const sourceString = typeof source === 'string' ? source : source.toString();
  let json: Partial<IWeappConfigJSON>;

  console.info('skr: loader options', options);

  try {
    json = JSON.parse(sourceString);
  } catch (e) {
    console.error(e);
    return;
  }
}

export default loader;
