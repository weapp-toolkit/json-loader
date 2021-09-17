/** 带 cache 属性的 function，用于局部缓存，避免使用全局变量 */
export type CachedFunction<T extends (...args: any[]) => any> = T & {
  cache?: Record<string, DependencyTreeNode>;
};
