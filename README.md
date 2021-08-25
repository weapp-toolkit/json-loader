# weapp-toolkit
微信小程序 webpack loader 和 plugin

| package&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | description |
|---|---|
| json-loader | 处理 json 文件，可以添加自定义初始配置，如页面背景色 |
| assets-loader   | 处理 js、wxml、wxs 文件内的资源依赖 |
| weapp-plugin | 处理 app、页面及组件依赖，优化 chunk 和独立分包的引用 |

# Contribution
## Init repo
```
npm install -g lerna nodemon ts-node
lerna bootstrap --hoist
```
按下 `cmd + shift + p` 输入 `task`，选择 `[package]: dev` 运行
