/**
 * 微信小程序 TabBar 列表项
 */
export interface IWeappTabBarItem {
  /** 页面路径，必须在 pages 中先定义 */
  pagePath: string;
  /** tab 上按钮文字 */
  text: string;
  /** 图片路径，icon 大小限制为 40kb，建议尺寸为 81px * 81px，不支持网络图片。当 position 为 top 时，不显示 icon */
  iconPath?: string;
  /** 选中时的图片路径，icon 大小限制为 40kb，建议尺寸为 81px * 81px，不支持网络图片。当 position 为 top 时，不显示 icon */
  selectedIconPath?: string;
}

/**
 * 微信小程序 TabBar
 */
export interface IWeappTabBar {
  /** tab 的列表，详见 list 属性说明，最少 2 个、最多 5 个 tab */
  list: IWeappTabBarItem[];
  /** 自定义 tabBar */
  custom: boolean;
}

/**
 * 小程序分包配置
 */
export interface IWeappSubPackage {
  /** 分包根目录 */
  root: string;
  /** 分包别名，分包预下载时可以使用 */
  name?: string;
  /** 分包页面路径，相对于分包根目录 */
  pages: string[];
  /** 分包是否是独立分包 */
  independent?: boolean;
}

/**
 * usingComponent 类型
 */
export type IWeappUsingComponent = Record<string, string>;

/**
 * 小程序 app.json 配置
 */
export interface IWeappAppConfig {
  /** 小程序默认启动首页 */
  entryPagePath?: string;
  /** 页面路径列表 */
  pages: string[];
  /** 底部 tab 栏的表现 */
  tabBar?: IWeappTabBar;
  /** 分包结构配置 */
  subpackages?: IWeappSubPackage[];
  /** 分包结构配置 */
  subPackages?: IWeappSubPackage[];
  /** Worker 代码放置的目录 */
  workers?: string;
  /** 全局自定义组件配置 */
  usingComponents?: IWeappUsingComponent;
  /** 指明 sitemap.json 的位置 */
  sitemapLocation: string;
  /** 指明 theme.json 的位置，darkmode 为 true 为必填 */
  themeLocation?: string;
}

/**
 * 微信小程序页面配置
 */
export interface IWeappPageConfig {
  backgroundColor?: string;
  usingComponents?: IWeappUsingComponent;
  componentGenerics?: Record<string, boolean | { default: string }>;
  navigationBarTitleText?: string;
}

/**
 * 微信小程序组件配置
 */
export interface IWeappComponentConfig {
  usingComponents?: IWeappUsingComponent;
}
