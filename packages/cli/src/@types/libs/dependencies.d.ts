import _Dependencies from '../../libs/dependencies';

export interface PackageType {
  name?: string;
  root: string;
  pages: string[];
}

export interface PackageMapType {
  [name: string]: {
    pathname: string;
    pages: string[];
    dependencies?: Record<string, string>;
  };
}

export interface PackageListType {
  name: string;
  pathname: string;
  pages: string[];
}

export interface PackageAliasType {
  [name: string]: string;
}

export type Dependencies = typeof _Dependencies;

export interface NpmCIResultType {
  miniProgramPackNum: number;
  otherNpmPackNum: number;
  warnList: {
    jsPath: string;
    code: string;
    tips: string;
    msg: string;
  }[];
}
