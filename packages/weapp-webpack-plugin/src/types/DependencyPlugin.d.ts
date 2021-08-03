/**
 * DependencyPlugin 初始化选项
 */
export interface IDependencyPluginOptions {
  ignore?: Array<string | RegExp> /** 忽略的文件（夹） */;
}

/**
 * DependencyPlugin chunk list 项
 */
export interface IDependencyPluginChunk {
  name: string;
}
