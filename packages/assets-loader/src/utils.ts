import { Assets, AssetsType } from './types';

const RegExps = {
  RoughlyMatcher: /['"`][^=;]*?\.[a-zA-Z]+['"`]/g,
  HttpMatcher: /^https?|\/\/[^'"`]+\.\w+$/,
  NormalMatcher: /^[^'"`]+\.\w+$/,
  GlobMatcher: /(.*)?[${}+'"`]+(.*)?\.\w+$/,
};

/**
 * 从字符串解析资源
 * @param context 源码所在文件夹
 * @param request
 */
const handleAssets = (context: string, request: string): Assets => {
  const plainRequest = request.replace(/\s\r\t\n/g, '').replace(/^['"`]/, '').replace(/['"`]$/, '');
  console.info('skr: plainRequest', plainRequest);

  if (RegExps.HttpMatcher.test(plainRequest)) {
    return {
      type: AssetsType.Http,
      request: plainRequest,
    };
  }

  if (RegExps.NormalMatcher.test(plainRequest)) {
    return {
      type: AssetsType.Normal,
      request: plainRequest,
    };
  }

  return {
    type: AssetsType.Unknown,
    request: plainRequest,
  };
};

/**
 * 获取源码中的资源
 * @param context 源码所在文件夹
 * @param sourceCode 源码
 * @returns
 */
export const getAssets = (context: string, sourceCode: string): Assets[] => {
  const roughlyMatchResult = sourceCode.match(RegExps.RoughlyMatcher) || [];
  console.info('skr: roughlyMatchResult', roughlyMatchResult);

  const assets = roughlyMatchResult.map((roughlyResult) => handleAssets(context, roughlyResult));
  console.info('skr: assets', assets);

  return assets;
};
