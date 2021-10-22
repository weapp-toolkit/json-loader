import path from 'path';
import { GraphNode } from '.';
import { DependencyGraph } from './Graph';

/**
 * 路径计算工具类
 */
export default class GraphUtil {
  private graphNodeRoot: DependencyGraph;

  constructor(graphNodeRoot: DependencyGraph) {
    this.graphNodeRoot = graphNodeRoot;
  }

  /**
   * 获取当前资源的输出路径
   * @param source 当前资源绝对路径或对应的 graphNode
   * @param packageName 当前 packageName
   */
  public getOutputAbsolutePath(source: string | GraphNode, packageName: string): string {
    const { graphNodeIndex } = this.graphNodeRoot;
    const graphNode = source instanceof GraphNode ? source : graphNodeIndex.getNodeByRequest(source);

    if (!graphNode) {
      return source as string;
    }

    return graphNode.outputMap.get(packageName) || graphNode.resourcePath;
  }

  /**
   * 获取当前资源相对 app 根目录的输出路径
   * @param source 当前资源绝对路径或对应的 graphNode
   * @param packageName 当前 packageName
   */
  public getOutputRelativePath(source: string | GraphNode, packageName: string): string {
    const sourceOutputPath = this.getOutputAbsolutePath(source, packageName);

    return path.relative(this.graphNodeRoot.context, sourceOutputPath);
  }

  /**
   * 获取资源引用相对路径
   * @param source 当前资源绝对路径
   * @param reference 引用资源绝对路径
   * @param packageName 当前 packageName
   */
  public getReferencePath(source: string, reference: string, packageName: string): string {
    const sourceOutputPath = this.getOutputAbsolutePath(source, packageName);
    const referenceOutputPath = this.getOutputAbsolutePath(reference, packageName);

    return path.relative(path.dirname(sourceOutputPath), referenceOutputPath);
  }

  // public get
}
