import cp from 'child_process';
// import { CustomConfig } from '../@types/config';
import spawn from './spawn';

type NpmFunction = (args: string[], options?: cp.SpawnOptionsWithoutStdio) => Promise<any>;

export default (registry: string /* customConfig: Partial<CustomConfig> */): NpmFunction => {
  // const { registry } = customConfig;
  const _args: string[] = [];

  if (registry) {
    _args.push(`--registry=${registry}`);
  }

  return (args, options) => spawn('npm', args.concat(_args), options);
};
