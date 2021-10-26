import { FileResolver, shouldIgnore } from '@weapp-toolkit/tools';
import { GraphNodeType } from '.';
import { GraphNode, GraphNodeOptions } from './GraphNode';
import GraphNodeIndex from './GraphNodeIndex';

interface GraphNodeFactoryOptions {
  /** 忽略的文件 */
  ignores: RegExp[];
  /** 文件路径解析器 */
  resolver: FileResolver;
}

interface CreateGraphNodeOptions extends Omit<GraphNodeOptions, 'resourcePath'> {
  context: string;
  reference: string;
}

const DEFAULT_IGNORES = [/^plugin:/];

/**
 * 创建 GraphNode 的工厂类
 */
export default class GraphNodeFactory {
  private ignores: RegExp[] = DEFAULT_IGNORES;

  private resolver: FileResolver;

  public nodeIndex = new GraphNodeIndex();

  constructor(options: GraphNodeFactoryOptions) {
    this.ignores = options.ignores.concat(this.ignores);
    this.resolver = options.resolver;
  }

  public createGraphNode(thisNode: GraphNode, options: CreateGraphNodeOptions): GraphNode | null {
    const { ignores, nodeIndex } = this;
    const { packageNames, reference, context } = options;

    if (shouldIgnore(ignores, reference)) {
      return null;
    }

    /**
     * 获取完整路径
     */
    const resourcePath = this.resolver.resolveDependencySync(context, reference);

    let graphNode = nodeIndex.getNodeByRequest(resourcePath);

    /** 如果已经有创建过，复用 */
    if (graphNode) {
      packageNames.forEach((packageName) => {
        /** 搞不懂为什么报错，ts bug？ */
        this.recursiveAddPackageName(graphNode!, packageName);
      });
    } else {
      /** 否则创建新的节点并缓存 */
      graphNode = new GraphNode(
        Object.assign(options, { resourcePath, graphNodeFactory: this, resolver: this.resolver }),
      );
      nodeIndex.add(graphNode);
    }

    /** 创建依赖图的边 */
    thisNode.outgoingNodes.add(graphNode);
    graphNode.incomingNodes.add(thisNode);

    return graphNode;
  }

  public cleanCache(): void {
    this.nodeIndex.clear();
  }

  /**
   * 递归添加节点的 packageNames
   * @param node
   * @param packageName
   */
  private recursiveAddPackageName(node: GraphNode, packageName: string) {
    if (!node.packageNames.has(packageName)) {
      node.packageNames.add(packageName);
      /** 给其引用节点也添加 packageNames */
      node.outgoingNodes.forEach((outgoingModule) => {
        this.recursiveAddPackageName(outgoingModule, packageName);
      });
    }
  }
}
