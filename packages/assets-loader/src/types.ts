export enum AssetsType {
  Normal,
  Glob,
  Http,
  Unknown,
}

export interface NormalAssets {
  type: AssetsType.Normal;
  request: string;
}

export interface GlobAssets {
  type: AssetsType.Glob;
  request: string /** glob */;
}

export interface HttpAssets {
  type: AssetsType.Http;
  request: string; /** http 资源 */
}

export interface UnknownAssets {
  type: AssetsType.Unknown;
  request: string; /** http 资源 */
}

export type Assets = NormalAssets | GlobAssets | HttpAssets | UnknownAssets;
