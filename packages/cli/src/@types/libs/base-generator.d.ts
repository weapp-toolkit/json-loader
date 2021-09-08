export interface CopyOptions {
  force?: boolean /* 是否强制覆盖 */;
  ignores?: string[];
  extname?: {
    from: string;
    to: string;
  }[];
}
