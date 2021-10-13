import path from 'path';

/**
 * 资源类型定义
 */
export type AssetType = 'json' | 'js' | 'css' | 'wxml' | 'wxs' | 'other';

/**
 * 获取资源类型
 * @param filename
 * @returns
 */
export const getAssetType = (filename: string): AssetType => {
  const ext = path.extname(filename);

  switch (ext) {
    case '.js':
    case '.ts':
      return 'js';
    case '.json':
    case '.cjson':
      return 'json';
    case '.wxml':
      return 'wxml';
    case '.wxs':
      return 'wxs';
    case '.css':
    case '.wxss':
    case '.less':
    case '.scss':
    case '.sass':
    case '.styl':
    case '.stylus':
    case '.postcss':
      return 'css';
    default:
      return 'other';
  }
};
