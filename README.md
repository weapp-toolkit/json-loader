# weapp-toolkit

微信小程序 webpack loader 和 plugin

| package&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | description                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------- |
| core                                                                | 公共方法                                                |
| weapp-types                                                         | 公共类型定义                                            |
| weapp-plugin                                                        | 处理 app、页面及组件 entry，优化 chunk 和独立分包的引用 |
| assets-loader                                                       | 处理 js、json、wxml、wxs 等文件内的资源依赖             |
| json-loader                                                         | 处理 json 文件，可以添加自定义初始配置，如页面背景色    |
| cdn-loader                                                          | 将图片替换为 cdn 路径，并统一输出到一个文件夹供上传     |
| cli                                                                 | 集合创建、依赖安装、构建、上传等功能于一体的脚手架工具  |

# Contribution

## Init repo

克隆项目后

```
npm install -g lerna pnpm nodemon ts-node
pnpm i
```

按下 `cmd + shift + p` 输入 `task`，选择 `[package]: debug` 运行调试
