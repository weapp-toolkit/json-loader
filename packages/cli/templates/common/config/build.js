const spawn = require('cross-spawn');
const path = require('path');
const fsx = require('fs-extra');
const config = require('../imp.config');

/* 要发布的文件（夹） */
const copyPaths = ['miniprogram_npm', 'assets', 'components', 'libs'];

const basePath = path.resolve('.', config.baseDir, config.output);
const destPath = path.resolve('.', 'public');

const copy = (src, dest) => {
  if (fsx.existsSync(src)) {
    fsx.copySync(src, dest);
  }
};

/* 清空产物文件夹 */
fsx.removeSync(destPath);

/* 构建项目 */
spawn.sync('npx', ['imp', 'build'], {
  stdio: [0, 1, 2],
});

/* 拷贝组件 */
console.log('\n拷贝构建结果...');
copyPaths.forEach((filepath) => {
  const from = path.join(basePath, filepath);
  const to = path.join(destPath, filepath);
  copy(from, to);
});
console.log('拷贝完成!');
