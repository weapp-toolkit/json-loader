import $ from 'lodash';
import { GraphNode } from '../DependencyGraph';

export interface PackageInfo {
  /** 分包名 */
  name: string;
  /** 分包根路径 */
  root: string;
  /** 是否独立分包 */
  independent: boolean;
  /** 包含的节点 */
  member: Set<GraphNode>;
}

/**
 * 小程序分包管理器
 * - 通过分包名进行索引
 * - 在 Graph 根节点创建分包
 * - 在创建子节点时添加分包 member
 */
export default class PackageManager {
  static TAG = 'PackageManager';

  private defaultPackageInfo: Omit<PackageInfo, 'name'> = { root: '', independent: false, member: new Set() };

  private packageInfoMap = new Map<string, PackageInfo>();

  /**
   * 设置分包信息
   * @param packageName
   * @param packageInfo
   */
  public set(packageName: string, packageInfo?: Partial<PackageInfo>): void {
    this.packageInfoMap.set(packageName, $.defaults(packageInfo, { name: packageName }, this.defaultPackageInfo));
  }

  /**
   * 获取分包信息
   * @param packageName
   * @returns
   */
  public get(packageName: string): PackageInfo | undefined {
    return this.packageInfoMap.get(packageName);
  }

  /**
   * 重置分包管理器
   */
  public reset(): void {
    this.packageInfoMap.clear();
  }

  /**
   * 添加分包成员
   * @param packageName
   * @param node
   */
  public addMember(packageName: string, node: GraphNode): void {
    const packageInfo = this.get(packageName);

    this.warnIfNotFoundPackage(packageName, packageInfo);

    packageInfo?.member.add(node);
  }

  /**
   * 获取分包成员列表
   * @param packageName
   * @returns
   */
  public getMember(packageName: string): GraphNode[] {
    const packageInfo = this.get(packageName);

    this.warnIfNotFoundPackage(packageName, packageInfo);

    return Array.from(packageInfo?.member || []);
  }

  /**
   * 分包是否是独立分包
   * @param packageName
   * @returns
   */
  public isIndependent(packageName: string): boolean {
    const packageInfo = this.get(packageName);

    this.warnIfNotFoundPackage(packageName, packageInfo);

    return packageInfo?.independent || false;
  }

  /**
   * 资源是否位于分包内
   * @param packageName
   * @param relativePath 资源相对 app 的路径
   */
  public isLocatedInPackage(packageName: string, relativePath: string): boolean {
    const packageInfo = this.get(packageName);

    this.warnIfNotFoundPackage(packageName, packageInfo);

    return relativePath.startsWith(packageInfo?.root ?? packageName);
  }

  /**
   * 未找到分包的警告
   * @param packageName
   * @param packageInfo
   */
  private warnIfNotFoundPackage(packageName: string, packageInfo?: PackageInfo) {
    if (!packageInfo) {
      console.warn(`[${PackageManager.TAG}] 找不到分包 ${packageName} 的信息`);
    }
  }
}
