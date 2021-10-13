import { removeExt } from '@weapp-toolkit/tools';
import { DependencyGraphNode } from './GraphNode';

export class GraphNodeMap {
  // static instance?: GraphNodeMap;

  /** 模块列表 */
  public modules = new Set<DependencyGraphNode>();

  /** 绝对路径 => 模块 */
  public requestModuleMap = new Map<string, DependencyGraphNode>();

  /** chunkName => 模块 */
  public chunkModuleMap = new Map<string, DependencyGraphNode>();

  constructor(defaultSet?: Set<DependencyGraphNode> | DependencyGraphNode[]) {
    if (defaultSet) {
      this.init(defaultSet);
    }
  }

  /** 出于分形和扩展性的考虑，不采用全局状态管理 */
  // /**
  //  * 获取 GraphNodeMap 单例
  //  * @returns
  //  */
  // static getInstance(): GraphNodeMap {
  //   return GraphNodeMap.instance || (GraphNodeMap.instance = new GraphNodeMap());
  // }

  /**
   * 添加节点
   * @param node
   */
  public add(node: DependencyGraphNode | DependencyGraphNode[] | Set<DependencyGraphNode>): GraphNodeMap {
    if (Array.isArray(node) || node instanceof Set) {
      node.forEach(this.addOneNode.bind(this));
      return this;
    }

    this.addOneNode(node);
    return this;
  }

  /**
   * 清除所有模块
   */
  public clear(): void {
    this.modules = new Set<DependencyGraphNode>();
    this.requestModuleMap = new Map<string, DependencyGraphNode>();
    this.chunkModuleMap = new Map<string, DependencyGraphNode>();
  }

  /**
   * 通过绝对路径查找模块
   * @param request
   * @returns
   */
  public getNodeByRequest(request: string): DependencyGraphNode | undefined {
    return this.requestModuleMap.get(removeExt(request));
  }

  /**
   * 通过 chunkName 查找模块
   * @param chunkName
   * @returns
   */
  public getNodeByChunkName(chunkName: string): DependencyGraphNode | undefined {
    return this.chunkModuleMap.get(chunkName);
  }

  /**
   * 连接多个 GraphNodeMap
   * @param graphNodeMaps
   */
  public concat(...graphNodeMaps: GraphNodeMap[]): GraphNodeMap {
    const combinedGraphNodeMap = new GraphNodeMap(this.modules);

    graphNodeMaps.forEach((graphNodeMap) => {
      combinedGraphNodeMap.add(graphNodeMap.modules);
    });

    return combinedGraphNodeMap;
  }

  private init(defaultSet: Set<DependencyGraphNode> | DependencyGraphNode[]) {
    defaultSet.forEach((node) => {
      this.add(node);
    });
  }

  /**
   * 添加一个节点
   * @param node
   */
  private addOneNode(node: DependencyGraphNode): void {
    const { pathname } = node;

    this.modules.add(node);
    this.requestModuleMap.set(removeExt(pathname), node);
  }

  /**
   * 需要等graph build完成后再生成chunkModuleMap
   * 因为依赖关系变化会导致chunkName改变
   */
  public buildChunkModuleMap() {
    this.modules.forEach((node) => {
      const { chunkName } = node;
      this.chunkModuleMap.set(chunkName, node);
    });
  }
}
