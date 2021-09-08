import path from 'path';
import rename from 'gulp-rename';
import { TaskPlugins } from '../libs/gulp-task.class';
import { option } from '../config';

/**
 * 保持路径结构完整
 * @param ext 替换后缀
 */
export const relativePath = (ext?: string) => {
  return rename((newFile, file) => {
    // 保持文件路径完整
    newFile.dirname = path.dirname(path.relative(option.cwd, file.path));

    if (ext) {
      newFile.extname = ext;
    }
  });
};

const relativePathPlugin: TaskPlugins = (stream) => {
  return stream.pipe(relativePath());
};

export default relativePathPlugin;
