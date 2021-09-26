export interface IPlaceholderMapValue {
  /** 引用资源的绝对路径 */
  reference: string;
  /** 引用资源相对的文件夹绝对路径 */
  referenceDir?: string;
  /** 引用资源的类型 */
  referenceType?: 'file' | 'dir';
  /** json 内的组件依赖需要删除后缀名 */
  shouldRemoveExt?: boolean;
}

export type PlaceholderMap = Map<string, IPlaceholderMapValue>;

/** 自定义额外的 AssetInfo */
export interface CustomAssetInfo {
  /** 占位符映射表 */
  placeholderMap?: PlaceholderMap;
  /** 是否保持文件名 */
  keepName?: boolean;
  /** 替换后缀名 */
  extname?: string;
}
