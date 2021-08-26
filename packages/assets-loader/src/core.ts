import { Assets, AssetsType } from './types';

const RegExps = {
  RoughlyMatcher: /['"`][^=;]*?\.[a-zA-Z]+['"`]/g,
  TemplateStringMatcher: /(?<=[^${}'"`]+)[${]\{(.*)?\}\}?/g,
  ExpressionMatcher: /(?<=[^${}'"`]+)['"`](.*?)['"`]/g,
};

const AssetsMatcher = {
  HttpMatcher: /^https?|\/\/[^'"`]+\.\w+$/,
  NormalMatcher: /^[^${}'"`]+\.\w+$/,
  GlobMatcher: /[${}+'"`]+(.*)?\.\w+$/,
};

/**
 * 从字符串解析资源
 * @param request
 */
const handleAssets = (request: string): Assets => {
  const plainRequest = request.replace(/\s\r\t\n/g, '').replace(/^['"`]/, '').replace(/['"`]$/, '');
  console.info('skr: plainRequest', plainRequest);

  if (AssetsMatcher.HttpMatcher.test(plainRequest)) {
    return {
      type: AssetsType.Http,
      request: plainRequest,
    };
  }

  if (AssetsMatcher.NormalMatcher.test(plainRequest)) {
    return {
      type: AssetsType.Normal,
      request: plainRequest,
    };
  }

  if (AssetsMatcher.GlobMatcher.test(plainRequest)) {
    let handledRequest = plainRequest;
    handledRequest = handledRequest.replace(RegExps.TemplateStringMatcher, '*');
    handledRequest = handledRequest.replace(RegExps.ExpressionMatcher, '*');

    return {
      type: AssetsType.Glob,
      request: handledRequest,
    };
  }

  return {
    type: AssetsType.Unknown,
    request: plainRequest,
  };
};

/**
 * 获取源码中的资源
 * @param sourceCode 源码
 * @returns
 */
export const getAssets = (sourceCode: string): Assets[] => {
  const roughlyMatchResult = sourceCode.match(RegExps.RoughlyMatcher) || [];
  console.info('skr: roughlyMatchResult', roughlyMatchResult);

  const assets = roughlyMatchResult.map((roughlyResult) => handleAssets(roughlyResult));
  console.info('skr: assets', assets);

  return assets;
};
