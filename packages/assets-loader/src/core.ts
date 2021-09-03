import { Assets, AssetImportType } from './types';

interface IHandleSourceCodeResult {
  assets: Assets[];
  code: string;
}

/** 粗略匹配资源 */
const RoughlyMatcher = /((import|require)[^'"`=]*?)?['"`][^;<>]*?\.[a-zA-Z]+['"`]/gm;
/** 匹配模板字符串拼接资源 */
const TemplateStringMatcher = /(?<=[^${}'"`]+)[${]\{(.*)?\}\}?/g;
/** 匹配表达式拼接资源 */
const ExpressionMatcher = /(?<=[^${}'"`]+)['"`](.*?)['"`]/g;
/** 匹配模块化引入的资源 */
const ImportMatcher = /^\s?(import|require)(\b|[^\w])/;
/** 匹配 http 资源 */
const HttpMatcher = /^(https?|\/\/).+\.\w+$/;
/** 匹配纯文本资源 */
const NormalMatcher = /^[^{}'"`]+\.\w+$/;
/** 匹配非纯文本资源 */
const GlobMatcher = /[${}+'"`]+(.*)?\.\w+$/;


export const getAssetsLoaderPlaceholder = (index: number): string => `___ASSETS_LOADER_PLACEHOLDER_${index}___`;

/**
 * 从字符串解析资源
 * @param code
 */
const handleAssets = (code: string): Assets => {
  const request = code.replace(/\s\r\t\n/g, '').replace(/^['"`]/, '').replace(/['"`]$/, '');

  if (HttpMatcher.test(request)) {
    return {
      type: AssetImportType.Http,
      request,
      code,
    };
  }

  if (NormalMatcher.test(request)) {
    return {
      type: AssetImportType.Normal,
      request,
      code,
    };
  }

  if (GlobMatcher.test(request)) {
    let handledRequest = request;
    handledRequest = handledRequest.replace(TemplateStringMatcher, '*');
    handledRequest = handledRequest.replace(ExpressionMatcher, '*');

    return {
      type: AssetImportType.Glob,
      request: handledRequest,
      code,
    };
  }

  return {
    type: AssetImportType.Unknown,
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
  const code = sourceCode.replace(RoughlyMatcher, (match) => {
    /** 模块引入忽略处理 */
    if (ImportMatcher.test(match)) {
      return match;
    }

    // console.info('skr: replace', match, ImportMatcher.test(match));
    roughlyMatchResult.push(match);
    /** 将资源缓存，并替换为占位字符串，后续替换代码使用 */
    return getAssetsLoaderPlaceholder(roughlyMatchResult.length - 1);
  });

  // const roughlyMatchResult = sourceCode.match(RoughlyMatcher) || [];
  // console.info('skr: roughlyMatchResult', roughlyMatchResult);

  const assets = roughlyMatchResult.map((roughlyResult) => handleAssets(roughlyResult));
  // console.info('skr: assets', assets);

  return { assets, code };
};

/**
 * 替换掉代码中的占位符
 */
export function replacePlaceholder(index: number, code: string, replacer: string): string {
  const regex = new RegExp(getAssetsLoaderPlaceholder(index));
  return code.replace(regex, replacer);
}
