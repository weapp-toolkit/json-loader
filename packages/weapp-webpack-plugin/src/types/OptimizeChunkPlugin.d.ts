import { DependencyTree } from '../modules/dependency/DependencyTree';

/**
 * DependencyPlugin 初始化选项
 */
export interface ISplitChunkPluginOptions {
  ignore?: Array<string | RegExp> /** 忽略的文件（夹） */;
  dependencyTree: DependencyTree /** 依赖树实例 */;
}
