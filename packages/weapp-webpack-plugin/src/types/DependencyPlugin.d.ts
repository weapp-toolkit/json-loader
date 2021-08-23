/**
 * DependencyPlugin 初始化选项
 */
export interface IDependencyPluginOptions {
  ignore?: Array<string | RegExp> /** 忽略的文件（夹） */;
  dependencyTree: DependencyTree /** 依赖树实例 */;
}

/**
 * DependencyPlugin chunk list 项
 */
export interface IDependencyPluginChunk {
  name: string;
}

export interface IWebpackEntryOption {
  // [key: string]: {
  //   import: string[]
  // }
  [key: string]: string | string[];
}
