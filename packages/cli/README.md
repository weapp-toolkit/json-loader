# IMWeb Miniprogram CLI

微信小程序脚手架工具，提供初始化模板、自动编译、文件创建、npm 一键安装、CI/CD 等功能。

# 目录

- [Feature](#feature)
- [快速开始](#快速开始)
  - [安装](#安装)
  - [帮助](#帮助)
  - [现有项目接入](#现有项目接入)
- [注意事项](#注意事项)
  - [npm 相关](#npm-相关)
  - [模块引入相关](#模块引入相关)
- [Changelog](#changelog)
  - [1.14.0](#1140)
  - [1.13.0](#1130)
  - [1.12.0](#1120)
  - [1.11.0](#1110)
  - [1.10.0](#1100)
  - [1.9.0](#190)
  - [1.8.0](#180)
  - [1.7.0](#170)
  - [1.6.0](#160)
- [版本升级指南](#版本升级指南)
  - [Step 1](#step-1)
  - [Step 2](#step-2)
  - [Step 3](#step-3)
- [Config](#config)
- [Commands](#commands)
  - [create](#create)
  - [init](#init)
  - [package](#package)
  - [page](#page)
  - [component](#component)
  - [install](#install)
  - [uninstall](#uninstall)
  - [remove](#remove)
  - [build](#build)
  - [dev](#dev)
  - [publish](#publish)
  - [clean](#clean)
- [Options](#options)
  - [clear](#clear)
  - [profile](#profile)
- [Compilers](#compilers)
  - [Gulp Task](#gulp-task)
- [Q&A](#qa)
  - [CSS 文件没有编译](#css文件没有编译)
  - [CI 流水线构建报错](#ci-流水线构建报错)
  - [imp i 没有安装成功](#imp-i-没有安装成功)
  - [文件修改后没有构建](#文件修改后没有构建)
  - [xxx.xx is not a function](#xxxxx-is-not-a-function)
  - [运行时出现下面的黄色警告](#运行时出现下面的黄色警告)
  - [用了别名之后无法跳转并且没有提示](#用了别名之后无法跳转并且没有提示)
  - [执行 npm i -g $(pwd) 报错](#执行-npm-i--g-pwd-报错)
- [贡献代码](#贡献代码)

# Feature

- 快速接入
- `css`、`less`、`sass` 自动编译
- `ts` 自动编译
- `npm` 包自动编译，支持分包 `npm` 安装
- 支持添加插件的内建 `gulp task`
- 支持**路径别名**
- 冷启动缓存、增量编译缓存
- 开发目录和生产目录独立
- 一键生成 `page`、`component`、分包
- 一键上传到小程序后台
- 依赖扫描，简单的依赖分析，自动排除未使用的组件，并在控制台打印 `warning`

# 快速开始

## 安装

```
npm install -g @tencent/imweb-miniprogram-cli
```

## 帮助

```sh
$ imp -h
Usage:  [options] [command]

Options:
  -V, --version                         output the version number
  -c, --clear                           清除构建文件
  -P, --profile                         输出项目依赖到 dependencies.json
  -h, --help                            display help for command

Commands:
  build                                 构建打包
  clean                                 清理开发目录内的 wxss 和 miniprogram_npm
  component|comp [options] [name]       在指定分包指定页面生成 component
  config [options] <key>                查看配置项
  config set <key> <value               设置配置项
  create [name]                         初始化新项目
  dev                                   开发环境打包
  init                                  在现有项目中初始化
  install|i [options] [modules...]      安装 npm 包，直接运行则进行初始化安装
  npm                                   构建 npm
  package|pkg [options] [pathname]      在指定位置生成分包，如 pages-report/study-report
  page [options] [name]                 在指定分包或页面生成 page
  publish [options] [version]           将代码上传到小程序后台
  remove|rm [options]                   删除对应分包的 node_modules 和 miniprogram_npm，缺省时删除所有
  uninstall|uni [options] <modules...>  卸载 npm 包

Helps:
  imp -h
  imp <command> -h
```

## 现有项目接入

### Step 1

切换到项目目录

```
imp init
```

根据提示初始化。

### Step 2

如果有不需要编译的目录，请在 `imp.config.js` 的 `ignore` 进行设置（如`ignore: ['vision/**']`），构建时将会跳过目录。

如果想拷贝这些目录，请参考下文 `Compiler-Gulp Task` 在 `CopyTask` 添加 `glob` 路径。

### Step 3

清除开发目录内的 `miniprogram_npm` 和 `wxss`，并自动修改 `.wxss` 后缀为设置的预处理器对应的后缀名，建议设置好 `ignore` 后进行。

```
imp clean
```

### Step 4

进行小程序分包 npm 初始化安装

```
imp i
```

### Step 5

开始编译

```
npm run dev
```

### Step 6

构建

```
npm run build
```

# 注意事项

## npm 相关

- 依赖应使用 `imp install [modules...] [options]` 安装在分包下，安装构建时不会读取源码目录外的 `package.json`。
- 独立分包的依赖请单独进行安装，小程序里独立分包与主包是隔离的。

## 模块引入相关

- 相对路径模块请务必使用 `./[moduleName]` 引入，请勿直接使用 `[moduleName]` 引入，将会被识别为 `npm` 模块。

# Changelog

## 1.14.0

- 使用 npm 作为包管理器，缺省值为 `https://mirrors.tencent.com/npm/`
- 增加 npm 代理配置，可在 `imp.config.js` 里添加配置，配置项为 `npmRegistry`

## 1.13.0

- 增加白名单配置，白名单内的文件不会被依赖分析忽略掉

`imp.config.js`

```diff
  ignore: string[]; // glob，忽略文件夹或文件，基于 srcRoot，如 ['kbone/*']
+ whitelist: string[]; // glob，白名单文件（夹），不会被 ignore 忽略，基于 srcRoot，如 ['custom-tab-bar']
  clearIgnore: string[]; // glob，执行 imp --clear 清除构建时忽略的文件夹或文件，基于 srcRoot，如 ['**/kbone/**']
```

## 1.12.0

- 支持组件库开发模式，新建项目时可选

`imp.config.js`

```diff
module.exports = {
  type: 'native',
+ componentLib: true,
  language: 'ts',
  // ...
}
```

## 1.11.0

- css 依赖打包优化，现在不会让编译器把文件复制进使用依赖的文件了，避免冗余
- 为了避免影响正在运行的业务，需要手动添加配置才可生效

```diff
// gulpfile.js
+ const cssConfig = {
+   lightcssIgnores: ['**/_vars.*', '**/_function.*'], // 不处理的 @import 依赖，会被预处理器拷贝到使用依赖的文件内，如 vars、mixins。
+   lightcssIgnoreNodeModules: true, // default: true，默认不处理 node_modules，让编译器处理
+   lightcssNotPackIgnoredFiles: false, // default: false, 是否不打包 `ignores` 忽略的模块。
+ };
+ const cssTask = new CssTask(cssConfig);
+ const cssPreprocessorTask = new CssPreprocessorTask(cssConfig);
```

## 1.10.0

- 加入质量上报

## 1.9.0

- 新增配置项 `clearIgnore`: 设置清理构建目录时忽略清理的项，`glob`，应用于 `imp --clear`。
- 新增 `dev` 命令：可监听分支切换并自动清理缓存重新构建（不会重新安装 `npm` 包，请配合 `clearIgnore` 使用）。

`imp.config.js`

```diff
module.exports = {
  // ...
  output: 'dist', // 输出目录，基于 baseDir
  ignore: [], // 要忽略的文件夹，基于 srcRoot
+ clearIgnore: ['**/miniprogram_npm/**'], // 清除构建时要忽略的文件夹，基于 output
  // ...
}
```

`package.json`

```diff
{
  "script": {
-   "dev": "gulp dev --NODE_ENV development",
+   "dev": "imp dev",
    "build": "imp build",
+   "publish": "imp build && imp publish"
  }
}
```

## 1.8.0

- `Break Change`
- 新增 `gulp task`：`wxmlTask`，支持 `wxml` 使用别名，`copyTask` 不再复制 `wxml`。

```diff
// gulpfile.js
//...
+ const { CssTask, CssPreprocessorTask, CopyTask, JavascriptTask, CleanTask, WxmlTask } = gulpCompiler;
//...
+ const wxmlTask = new WxmlTask();

const watchTask = (cb) => {
  cssPreprocessorTask.watcher();
  cssTask.watcher();
+ wxmlTask.watcher();
  javascriptTask.watcher();
  copyTask.watcher();
  cb();
};

task('build', series(
  cleanTask.compiler, /* 请务必放在第一位 */
  cssPreprocessorTask.compiler,
  cssTask.compiler,
+ wxmlTask.compiler,
  javascriptTask.compiler,
  copyTask.compiler
));

//...
```

## 1.7.0

- 新增 `gulp task`：`cleanTask`，可清除构建目录和配置 `ignore` 项。

```diff
// gulpfile.js

//...
+ const { CssTask, CssPreprocessorTask, CopyTask, JavascriptTask, CleanTask } = gulpCompiler;
const cssTask = new CssTask();
const cssPreprocessorTask = new CssPreprocessorTask();
const javascriptTask = new JavascriptTask();
const copyTask = new CopyTask();
+ const cleanTask = new CleanTask(); /* 清除构建目录，可配置 ignore */

//...
task('build', series(
+ cleanTask.compiler, /* 请务必放在第一位 */
  cssPreprocessorTask.compiler,
  cssTask.compiler,
  javascriptTask.compiler,
  copyTask.compiler
));

//...
```

## 1.6.0

- 内建 `gulp task`，脚手架更新时插件可同步更新；支持插件，暴露 `glob` 配置项。
- 可在 `imp.config.js` 配置文件添加 `babelrc` 字段用于配置 babel。

# 版本升级指南

## Step 1

全局升级脚手架：`tnpm i -g @tencent/imweb-miniprogram-cli@latest`。

项目内升级脚手架：`tnpm i -D @tencent/imweb-miniprogram-cli@latest`。

以下步骤请根据 `changelog` 决定是否执行，可根据 `changelog` 手动更新，也可以参考下文 `Config` 内容（若有更新）进行替换。

## Step 2

修改 `project.config.json` 的 `miniprogramRoot` 为源码目录。

## Step 3

按需备份 `imp.config.js`，执行 `imp init`（此命令可能会覆盖上述文件）。

# Config

`imp.config.js` 配置文件

```ts
interface ImpConfig {
  type: 'native';
  componentLib?: boolean; // 是否组件库开发模式
  language: 'js' | 'ts';
  appId: string; // 小程序 app id
  privateKeyPath: string; // 小程序 private key 路径
  srcRoot: string; // 小程序开发目录，基于 baseDir，相对路径，如 ./miniprogram、./src
  baseDir: string; // 指定工作区中小程序项目路径，相对路径，所有路径都相对于此路径
  output: string; // 输出目录，基于 baseDir，相对路径
  ignore: string[]; // glob，忽略文件夹或文件，基于 srcRoot，如 ['kbone/*']
  whitelist: string[]; // glob，白名单文件（夹），不会被 ignore 忽略，基于 srcRoot，如 ['custom-tab-bar']
  clearIgnore: string[]; // glob，执行 imp --clear 清除构建时忽略的文件夹或文件，基于 srcRoot，如 ['**/kbone/**']
  cssPreprocessor: 'postcss' | 'less' | 'sass'; // css 预处理器，'postcss'、'less'、'sass'
  typeInline: boolean; // 类型文件是否和业务代码放一起
  pageDefaultConfig: Record<string, any> & {
    // 页面文件中 json 文件的默认配置项，用于初始化页面 json 文件
    usingComponents: Record<string, string>;
    navigationBarTitleText?: string;
    backgroundColor?: string;
  };
  paths: Record<string, string>; // 路径别名配置，如 paths: { '@': path.resolve(__dirname, '../src')  }
  babelrc: any; // babel 配置
  npmRegistry: string; // npm 代理配置，缺省值为 https://mirrors.tencent.com/npm/
}
```

# Commands

## create

### 描述

新建项目。

### 调用

```sh
imp create [name]
```

### 参数

| 名称 | 类型     | 默认值 | 必填 |
| ---- | -------- | ------ | ---- |
| name | `string` |        | 否   |

#### name

- 设置项目名称，则在当前目录下新建一个文件夹创建项目，如：`imp create test-project`
- 设置为路径，则在指定位置创建项目，如：`imp create ./test/project`

项目名将自动从参数获取

### 选项

无

### 询问

1. 设置项目名称（英文）：作为项目包名
2. 设置项目名称（中文）：作为项目中文名
3. 选择项目类型：目前可选 `native`，暂不支持 `kbone`
4. 选择语言：目前支持 `js`、`ts`
5. 是否使用 `less`：项目样式是否用 `less` 编写。默认支持 `postcss`
6. 输入 APPID：填写小程序 APPID
7. 请手动将 private key 私钥文件放到项目根目录

在此之后脚手架将会自动生成模板并安装依赖。

## init

### 描述

在现有项目初始化脚手架。

### 调用

```sh
imp init
```

### 参数

无

### 选项

无

### 询问

1. 指定 baseDir（相对路径）：相对于小程序 `project.config.json` 的路径，默认 `'.'`
2. 选择项目类型：目前可选 `native`，暂不支持 `kbone`
3. 选择语言：目前支持 `js`、`ts`
4. 是否使用 `less`：项目样式是否用 `less` 编写。默认支持 `postcss`
5. 输入 `private key` 相对路径：默认从项目根路径查找，若没找到则询问

## package

### 描述

在指定位置生成分包，可设置别名。

### 调用

```sh
imp package [alias] [options]
```

或

```sh
imp pkg [alias] [options]
```

### 参数

| 名称     | 类型     | 默认值 | 必填 |
| -------- | -------- | ------ | ---- |
| pathname | `string` |        | 否   |

#### pathname

指定分包路径，如：

```sh
imp pkg pages-report/study-report
```

将会在 `pages-report/study-report` 创建一个名为 `pages-report/study-report` 的分包。

```json
{
  "subpackages": [
    {
      "root": "pages-report/study-report"
    }
  ]
}
```

### 选项

| 名称     | 别名 | 类型     | 默认值     | 必填 | 必须指定选项值 |
| -------- | ---- | -------- | ---------- | ---- | -------------- |
| alias    | -a   | `string` |            | 否   | 是             |
| language | -l   | `enum`   | 读配置文件 | 否   | 是             |

#### alias

设置分包别名。

```sh
imp pkg -a study-report
```

```json
// app.json
{
  "subpackages": [
    {
      "name": "study-report", // 别名
      "root": "pages-report",
      "pages": ["study-report/study-report"]
    }
  ]
}
```

#### language

**enum**: `ts`, `js`  
指定语言，默认读取配置文件 language 项，如：

```sh
imp pkg -l js
```

### 询问

1. 在哪个位置创建？：填写分包路径
2. 是否多页面？：

如：
分包路径为 `pages-report/study-report`，

若选是，则以 `pages-report` 为分包 `root`，`study-report` 作为分包下的页面（默认页面名 `index`）进行初始化：

```json
{
  "subpackages": [
    {
      "root": "pages-report",
      "pages": ["study-report/study-report"]
    }
  ]
}
```

否则，以此路径为整体创建分包：

```json
{
  "subpackages": [
    {
      "root": "pages-report/study-report",
      "pages": ["index"]
    }
  ]
}
```

1. 是否独立分包？
2. 选择语言：目前支持 `js`、`ts`

## page

### 描述

在指定分包或页面内生成页面。

### 调用

```sh
imp page [name] [options]
```

### 参数

| 名称 | 类型     | 默认值 | 必填 |
| ---- | -------- | ------ | ---- |
| name | `string` |        | 否   |

#### name

设置页面名称

```sh
imp page test-page
```

### 选项

| 名称     | 别名 | 类型     | 默认值     | 必填 | 必须指定选项值 |
| -------- | ---- | -------- | ---------- | ---- | -------------- |
| pathname | -p   | `string` |            | 否   | 是             |
| language | -l   | `enum`   | 读配置文件 | 否   | 是             |

#### pathname

指定页面路径，如：

```sh
imp page -p pages-report/study-report
```

将会在询问页面名称后在 `pages-report/pages-report` 创建一个页面。

#### language

**enum**: `ts`, `js`  
指定语言，默认读取配置文件 language 项，如：

```sh
imp page -l js
```

### 询问

1. 输入页面名称（使用横线分割）
2. 在哪个分包创建？：单选
3. 在哪个位置创建？：单选，可选择在当前分包目录下创建
4. 选择语言：目前支持 `js`、`ts`

## component

### 描述

在指定分包或页面生成组件。

### 调用

```sh
imp component [name] [options]
```

或

```sh
imp comp [name] [options]
```

### 参数

| 名称 | 类型     | 默认值 | 必填 |
| ---- | -------- | ------ | ---- |
| name | `string` |        | 否   |

#### name

设置组件名称

```sh
imp comp test-comp
```

### 选项

| 名称     | 别名 | 类型     | 默认值     | 必填 | 必须指定选项值 |
| -------- | ---- | -------- | ---------- | ---- | -------------- |
| pathname | -p   | `string` |            | 否   | 是             |
| language | -l   | `enum`   | 读配置文件 | 否   | 是             |

#### pathname

指定组件路径，如：

```sh
imp comp -p pages-report/study-report
```

将会在询问组件名称后在 `pages-report/pages-report` 创建一个组件。

#### language

**enum**: `ts`, `js`  
指定语言，默认读取配置文件 `language` 项，如：

```sh
imp comp -l js
```

### 询问

1. 输入组件名称（使用横线分割）
2. 在哪个分包创建？：单选
3. 在哪个位置创建？：单选，可选择在当前分包的 `components` 目录下创建
4. 选择语言：目前支持 `js`、`ts`

## install

### 描述

安装 `npm` 包，直接运行则进行初始化安装（检测所有有 `package.json` 的分包并安装）

### 调用

```sh
imp install [modules...] [options]
```

或

```sh
imp i [modules...] [options]
```

### 参数

| 名称    | 类型       | 默认值 | 必填 |
| ------- | ---------- | ------ | ---- |
| modules | `string[]` |        | 否   |

#### modules

`npm` 包名，可变参数，空格分隔

```sh
imp i immer chalk
```

### 选项

| 名称        | 别名 | 类型      | 默认值  | 必填 | 必须指定选项值 |
| ----------- | ---- | --------- | ------- | ---- | -------------- |
| packageName | -p   | `string`  |         | 否   | 否             |
| saveDev     | -D   | `boolean` | `false` | 否   | 否             |

#### packageName

- 指定分包，默认为主包

```sh
imp i -p pages-report
```

将会在 `pages-report` 安装。

- 不设置选项值则进入选择模式

```sh
$ imp i -p
? 在哪个分包下操作？ (Use arrow keys)
❯ root
  pages-report
  pages-dev
```

#### saveDev

是否开发环境依赖

```sh
imp i --save-dev
```

### 询问

1. 在哪个分包下操作？

## uninstall

### 描述

卸载 `npm` 包

### 调用

```sh
imp uninstall <modules...> <options>
```

或

```sh
imp uni <modules...> <options>
```

### 参数

| 名称    | 类型       | 默认值 | 必填 |
| ------- | ---------- | ------ | ---- |
| modules | `string[]` |        | 是   |

#### modules

`npm` 包名，可变参数，空格分隔

```sh
imp i immer chalk
```

### 选项

| 名称        | 别名 | 类型     | 默认值 | 必填 | 必须指定选项值 |
| ----------- | ---- | -------- | ------ | ---- | -------------- |
| packageName | -p   | `string` |        | 是   | 否             |

#### packageName

- 指定分包，默认为主包

```sh
imp uni -p pages-report
```

将会在 `pages-report` 卸载。

- 不设置选项值则进入选择模式

```sh
$ imp uni -p
? 在哪个分包下操作？ (Use arrow keys)
❯ root
  pages-report
  pages-dev
```

### 询问

1. 在哪个分包下操作？

## remove

### 描述

删除对应分包的 `node_modules` 和 `miniprogram_npm`，缺省时删除所有分包下的。

### 调用

```sh
imp remove [options]
```

或

```sh
imp rm [options]
```

### 参数

无

### 选项

| 名称        | 别名 | 类型       | 默认值 | 必填 | 必须指定选项值 |
| ----------- | ---- | ---------- | ------ | ---- | -------------- |
| packageName | -p   | `string[]` |        | 否   | 否             |

#### packageName

可变参数，空格分隔

- 指定分包

```sh
imp rm -p root pages-report
```

将会删除 `root`、`pages-report` 分包的 `node_modules` 和 `miniprogram_npm`。

- 不设置选项值则进入选择模式（多选）

```sh
$ imp rm -p
? 在哪个分包下操作？ (Press <space> to select, <a> to toggle all, <i> to invert? 在哪个分包下操作？
❯◉ root
 ◯ pages-report
 ◉ pages-dev
```

### 询问

1. 在哪些分包下操作？

## build

### 描述

构建打包。

### 调用

```sh
imp build
```

### 参数

无

## dev

### 描述

开发环境构建，检测分支切换自动重新构建。

### 调用

```sh
imp dev
```

### 参数

无

## publish

### 描述

将代码上传到小程序后台。若遇到 `invalid ip` 报错，请检查小程序后台开发设置-小程序代码上传的 IP 白名单。

PS：如果发现 `standard-version` 卡住，请检查是否被 `git cz` 拦截，使用 `ctrl + c` 跳过。

### 调用

```sh
imp publish [version] [options]
```

### 参数

| 名称    | 类型     | 默认值 | 必填 |
| ------- | -------- | ------ | ---- |
| version | `string` |        | 否   |

#### version

版本号

```sh
imp publish 3.3.2
```

不指定则进入选择模式

```sh
$ imp publish
? 请选择版本号（当前版本：3.3.1） (Use arrow keys)
  4.0.0（版本升级）
  3.4.0（特性更新）
❯ 3.3.2（问题修复 & 非特性更新）
```

### 选项

| 名称 | 别名 | 类型     | 默认值 | 必填 | 必须指定选项值 |
| ---- | ---- | -------- | ------ | ---- | -------------- |
| desc | -d   | `string` |        | 否   | 是             |

#### desc

- 发布描述及备注

```sh
imp publish --desc "修复bug"
```

### 询问

1. 请选择版本号
2. 输入发布描述或备注

## clean

### 描述

清理开发目录内的 `wxss` 和 `miniprogram_npm`，并重命名开发目录内原有的 `wxss` 为 `css`。

### 调用

```sh
imp clean
```

### 参数

无

### 选项

无

# Options

## clear

### 描述

清除构建文件（删除构建结果）

### 调用

```sh
imp --clear
```

或

```sh
imp -c
```

## profile

### 描述

输出项目分包依赖到 `dependencies.json`

### 调用

```sh
imp --profile
```

或

```sh
imp -P
```

# Compilers

## Gulp Task

选项定义

```ts
type TaskPlugins = <T extends NodeJS.ReadWriteStream>(stream: T) => NodeJS.ReadWriteStream;

interface ExtGlob {
  pattern: string[] /* 默认添加 node_modules 屏蔽 */;
  clearDefault?: boolean /* 是否清除 task 默认 glob，不清除将会添加在默认规则后面 */;
}

interface GulpTaskOptions {
  plugins?: TaskPlugins[];
  glob?: string[] | ExtGlob /* 设置 compileGlob 和 watchGlob */;
  compileGlob?: string[] | ExtGlob /* 单独设置 compileGlob */;
  watchGlob?: string[] | ExtGlob /* 单独设置 watchGlob */;
}
```

使用方法

```js
// gulpfile.js
const print = require('gulp-print').default;
const { series, task } = require('gulp');
const { gulpCompiler } = require('@tencent/imweb-miniprogram-cli');

const { CssTask, CssPreprocessorTask, CopyTask, JavascriptTask, CleanTask } = gulpCompiler;
const cssTask = new CssTask();
const cssPreprocessorTask = new CssPreprocessorTask();
const javascriptTask = new JavascriptTask({
  // 一个函数数组，函数入参为 gulp.src 生成的文件流，函数需要返回一个流
  plugins: [(stream) => stream.pipe(print())],
});
const copyTask = new CopyTask({
  // 相对于开发目录
  // default: ['**/*', '!**/*.{js,ts,css,less,scss,styl,stylus}']
  glob: ['vision/**'],
});
/* 清除构建目录 */
const cleanTask = new CleanTask({
  // 相对于输出目录
  ignore: ['vision/**'],
});

const watchTask = (cb) => {
  cssPreprocessorTask.watcher();
  cssTask.watcher();
  javascriptTask.watcher();
  copyTask.watcher();
  cb();
};

task(
  'build',
  series(
    cleanTask.compiler,
    cssPreprocessorTask.compiler,
    cssTask.compiler,
    javascriptTask.compiler,
    copyTask.compiler,
  ),
);
```

调用

```sh
$ gulp build
```

# Q&A

## CSS 文件没有编译

- css 依赖更新后，使用该依赖的文件不编译
- 这是因为 gulp 只监听到了那个文件更改，使用该依赖的文件没有更改，所以没有编译
- 临时解决方案：运行一次 `imp build`
- 后续会对这种情况进行兼容

## CI 流水线构建报错

脚手架将源码目录和构建目录分开了，代码仓库不存在构建产物，所以需要在 CI 执行时构建。

- 在项目安装 `tnpm i -D @tencent/imweb-miniprogram-cli@latest`
- 修改 `package.json` 的 `script`，增加一个 `build`，值为 `imp build`
- 在流水线增加 `npm run build` 任务

## imp i 没有安装成功

- imp 是以 `process.cwd()` 作为基础路径，需要在项目根目录运行
- 检查包下是否有 `package.json` 文件

## 文件修改后没有构建

- 检查 `imp.config.js` 的 `srcRoot` 指向是否正确

## xxx.xx is not a function

- 检查代码里是否有相对路径引入方式有问题，如 `import './data'` 写成了 `import 'data'`，这种写法会被识别为 `node_modules`

## 运行时出现下面的黄色警告

```
...
<w> (during deserialization of webpack/lib/NormalModule)
<w> (during deserialization of Map)
<w> (during deserialization of webpack/lib/cache/PackFileCacheStrategy PackContentItems)
...
```

这个是 `webpack` 文件缓存抛出的警告，一般出现在分支切换的操作下，删除 `node_modules/.cache/webpack` 重新构建即可。

## 用了别名之后无法跳转并且没有提示

- 安装 `别名路径跳转` vscode 插件并配置
- 安装 `Path Intellisense` vscode 插件并配置

## 执行 npm i -g $(pwd) 报错

- 先卸载以前安装的正式版本
- 再执行该命令

# 贡献代码

克隆项目后

```
$ npm i && npm run dev
$ npm run chmod
$ npm i -g $(pwd)
$ imp
```

如果提示找不到指令，尝试重启终端或者检查 `npm` 的 `bin` 目录是否加入 `$PATH`
