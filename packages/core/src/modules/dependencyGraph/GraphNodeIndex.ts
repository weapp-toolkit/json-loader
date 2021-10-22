import { GraphNode } from './GraphNode';
import { ChunkInfo } from './types';

/**
 * GraphNode 索引类
 */
export default class GraphNodeIndex {
  // static instance?: GraphNodeIndex;
  /** chunk 索引 */
  private _chunks = new Map<string, ChunkInfo>();

  /** node 列表 */
  public nodes = new Set<GraphNode>();

  /** 绝对路径 => 模块 */
  public requestModuleMap = new Map<string, GraphNode>();

  constructor(defaultSet?: Set<GraphNode> | GraphNode[]) {
    if (defaultSet) {
      this.init(defaultSet);
    }
  }

  public get chunks(): Map<string, ChunkInfo> {
    if (this._chunks.size === 0) {
      this.initChunks();
    }
    return this._chunks;
  }

  /** 出于分形和扩展性的考虑，不采用单例模式 */
  // /**
  //  * 获取 GraphNodeIndex 单例
  //  * @returns
  //  */
  // static getInstance(): GraphNodeIndex {
  //   return GraphNodeIndex.instance || (GraphNodeIndex.instance = new GraphNodeIndex());
  // }

  /**
   * 添加节点
   * @param node
   */
  public add(node: GraphNode | GraphNode[] | Set<GraphNode>): GraphNodeIndex {
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
    this.nodes.clear();
    this._chunks.clear();
    this.requestModuleMap = new Map<string, GraphNode>();
  }

  /**
   * 是否为空
   */
  public isEmpty(): boolean {
    return this.nodes.size === 0;
  }

  /**
   * 通过绝对路径查找模块
   * @param request
   * @returns
   */
  public getNodeByRequest(request: string): GraphNode | undefined {
    return this.requestModuleMap.get(request);
  }

  /**
   * 连接多个 GraphNodeIndex
   * @param graphNodeIndexes
   */
  public concat(...graphNodeIndexes: GraphNodeIndex[]): GraphNodeIndex {
    const combinedGraphNodeMap = new GraphNodeIndex(this.nodes);

    graphNodeIndexes.forEach((graphNodeIndex) => {
      combinedGraphNodeMap.add(graphNodeIndex.nodes);
    });

    return combinedGraphNodeMap;
  }

  /**
   * 初始化所有节点
   * @description 调用节点 init 方法计算一些图构建完成后才能计算的属性
   */
  public initGraphNodes(): void {
    this.nodes.forEach((node) => {
      node.init();
    });
  }

  /** 计算 chunk 索引 */
  private initChunks(): void {
    this.nodes.forEach((node) => {
      node.chunkInfos.forEach((chunkInfo) => this._chunks.set(chunkInfo.id, chunkInfo));
    });
  }

  private init(defaultSet: Set<GraphNode> | GraphNode[]) {
    defaultSet.forEach((node) => {
      this.add(node);
    });
  }

  /**
   * 添加一个节点
   * @param node
   */
  private addOneNode(node: GraphNode): void {
    const { resourcePath } = node;

    if (this.nodes.has(node)) {
      return;
    }

    this.nodes.add(node);
    this.requestModuleMap.set(resourcePath, node);
    /** 添加节点后需要重新计算 */
    this.chunks.clear();
  }
}
