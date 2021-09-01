import { Assets, AssetsType } from './types';

interface IHandleSourceCodeResult {
  assets: Assets[];
  code: string;
}

const RegExps = {
  RoughlyMatcher: /((import|require)[^'"`]*?)?['"`][^=;]*?\.[a-zA-Z]+['"`]/gm,
  ImportMatcher: /(import|require)[^'"`]*?(?=['"`])/gm,
  TemplateStringMatcher: /(?<=[^${}'"`]+)[${]\{(.*)?\}\}?/g,
  ExpressionMatcher: /(?<=[^${}'"`]+)['"`](.*?)['"`]/g,
};

const AssetsMatcher = {
  HttpMatcher: /^(https?|\/\/).+\.\w+$/,
  NormalMatcher: /^[^${}'"`]+\.\w+$/,
  GlobMatcher: /[${}+'"`]+(.*)?\.\w+$/,
};

export const ASSETS_MARKER_PLACEHOLDER = '__ASSETS_LOADER__PLACEHOLDER_';

/**
 * 从字符串解析资源
 * @param code
 */
const handleAssets = (code: string): Assets => {
  const request = code.replace(/\s\r\t\n/g, '').replace(/^['"`]/, '').replace(/['"`]$/, '');

  if (AssetsMatcher.HttpMatcher.test(request)) {
    return {
      type: AssetsType.Http,
      request,
      code,
    };
  }

  if (AssetsMatcher.NormalMatcher.test(request)) {
    return {
      type: AssetsType.Normal,
      request,
      code,
    };
  }

  if (AssetsMatcher.GlobMatcher.test(request)) {
    let handledRequest = request;
    handledRequest = handledRequest.replace(RegExps.TemplateStringMatcher, '*');
    handledRequest = handledRequest.replace(RegExps.ExpressionMatcher, '*');

    return {
      type: AssetsType.Glob,
      request: handledRequest,
      code,
    };
  }

  return {
    type: AssetsType.Unknown,
    request,
    code,
  };
};

/**
 * 处理源码并获取资源
 * @param sourceCode 源码
 * @returns
 */
export const handleSourceCode = (sourceCode: string): IHandleSourceCodeResult => {
  const roughlyMatchResult: string[] = [];
  const code = sourceCode.replace(RegExps.RoughlyMatcher, (match) => {
    /** 模块引入忽略处理 */
    if (RegExps.ImportMatcher.test(match)) {
      return match;
    }

    roughlyMatchResult.push(match);
    /** 将资源缓存，并替换为占位字符串，后续替换代码使用 */
    return ASSETS_MARKER_PLACEHOLDER + (roughlyMatchResult.length - 1);
  });

  // const roughlyMatchResult = sourceCode.match(RegExps.RoughlyMatcher) || [];
  console.info('skr: roughlyMatchResult', roughlyMatchResult);

  const assets = roughlyMatchResult.map((roughlyResult) => handleAssets(roughlyResult));
  console.info('skr: assets', assets);

  return { assets, code };
};
