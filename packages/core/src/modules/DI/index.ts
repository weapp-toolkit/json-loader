/**
 * 简易的依赖注入容器
 */
export class Container {
  private ContainerMap = new Map<string | symbol, any>();

  public set = (id: string | symbol, value: any): void => {
    this.ContainerMap.set(id, value);
  };

  public get = <T>(id: string | symbol): T => {
    return this.ContainerMap.get(id) as T;
  };

  public has = (id: string | symbol): boolean => {
    return this.ContainerMap.has(id);
  };
}
