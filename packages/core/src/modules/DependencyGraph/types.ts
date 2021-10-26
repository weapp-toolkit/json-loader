/**
 * 图节点类型
 */
export enum GraphNodeType {
  App = 'App',
  Page = 'Page',
  Component = 'Component',
  EntryAsset = 'EntryAsset',
  NormalAsset = 'NormalAsset',
}

/**
 * 自定义 Chunk 信息
 */
export interface ChunkInfo {
  /** chunk id */
  id: string;
  /** chunk group，用于生成 runtime */
  group: string;
  /** 是否属于独立分包 */
  independent: boolean;
  /** packageName */
  packageName: string;
}
