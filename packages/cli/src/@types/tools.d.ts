export type Require<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type ValueType<T, K extends keyof T> = T[K];
