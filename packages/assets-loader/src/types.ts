export enum AssetsType {
  Normal,
  Glob,
  Http,
  Unknown,
}

interface IBaseAssets {
  code: string; /** 源码 */
  request: string; /** 资源路径 */
}

export interface NormalAssets extends IBaseAssets {
  type: AssetsType.Normal;
}

export interface GlobAssets extends IBaseAssets {
  type: AssetsType.Glob;
  request: string /** glob 路径 */;
}

export interface HttpAssets extends IBaseAssets {
  type: AssetsType.Http;
  request: string; /** http 资源路径 */
}

export interface UnknownAssets extends IBaseAssets {
  type: AssetsType.Unknown;
}

export type Assets = NormalAssets | GlobAssets | HttpAssets | UnknownAssets;
