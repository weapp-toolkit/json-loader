export interface DataTypes {
  [key: string]: any;
}

export interface MethodTypes {
  [yourMethod: string]: (...args: any[]) => any;
}
