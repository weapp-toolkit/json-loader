import { TaskFunction } from 'gulp';
import { ignoreNodeModules, ignores } from '../config';

export type TaskPlugins = <T extends NodeJS.ReadWriteStream>(stream: T) => NodeJS.ReadWriteStream;

interface ExtGlob {
  pattern: string[] /* 默认添加 node_modules 屏蔽 */;
  clearDefault?: boolean /* 是否清除 task 默认 glob，不清除将会添加在默认规则后面 */;
}

export interface GulpTaskOptions {
  plugins?: TaskPlugins[];
  glob?: string[] | ExtGlob /* 设置 compileGlob 和 watchGlob */;
  compileGlob?: string[] | ExtGlob /* 单独设置 compileGlob */;
  watchGlob?: string[] | ExtGlob /* 单独设置 watchGlob */;
}

export type TaskWatcher = () => void;

export interface GulpTaskExtendsOptions {
  name: string /* 用于插件缓存 */;
  ext: string /* 用于 unlink 同步删除 */;
  defaultCompileGlob: string[];
  defaultWatchGlob: string[];
}

export class GulpTask {
  private options: GulpTaskOptions;

  public get compiler(): TaskFunction {
    return (done) => done();
  }

  public get watcher(): TaskWatcher {
    return () => {};
  }

  protected plugins: TaskPlugins[];

  protected name: string; /* task 名字 */

  protected ext: string;

  protected defaultCompileGlob: string[] = [];

  protected defaultWatchGlob: string[] = [];

  constructor(options: GulpTaskOptions = {}, extendsOptions: GulpTaskExtendsOptions) {
    this.options = options;
    this.name = extendsOptions.name;
    this.ext = extendsOptions.ext;
    this.defaultCompileGlob = extendsOptions.defaultCompileGlob;
    this.defaultWatchGlob = extendsOptions.defaultWatchGlob;

    this.plugins = options.plugins || [];
  }

  protected get compileGlob(): string[] {
    const { options } = this;
    return this.handleGlob(this.defaultCompileGlob, options.compileGlob || options.glob);
  }

  protected get watchGlob(): string[] {
    const { options } = this;
    return this.handleGlob(this.defaultWatchGlob, options.watchGlob || options.glob);
  }

  protected applyPlugins = (stream: NodeJS.ReadWriteStream, plugins: TaskPlugins[]): NodeJS.ReadWriteStream => {
    plugins.forEach((plugin) => {
      if (typeof plugin !== 'function') {
        throw new Error(`${this.name} plugin error: plugin must be Function`);
      }

      stream = plugin(stream);
    });
    return stream;
  };

  /**
   * 处理 glob
   * @param defaultGlob task 默认 glob
   * @param glob 用户自定义 glob，可选清除默认 glob
   *
   * @protected
   * @memberof GulpTask
   */
  protected handleGlob = (defaultGlob: string[], glob: string[] | ExtGlob | undefined): string[] => {
    const _glob = glob || [];
    let pattern: string[] = [];
    let clearDefault = false;

    if (_glob instanceof Array) {
      pattern = _glob;
    } else {
      if (!(_glob.pattern instanceof Array)) {
        throw new Error('Glob.pattern must be an array');
      }
      pattern = _glob.pattern;
      clearDefault = _glob.clearDefault || false;
    }

    const _defaultGlob = clearDefault ? [] : defaultGlob;
    /* 用自定义 glob 覆盖默认 glob 和 ignoreGlob，最后 ignore node_modules glob */
    return _defaultGlob.concat(ignores, pattern, ignoreNodeModules);
  };
}
