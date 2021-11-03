import path from 'path';
import { shortid } from '@weapp-toolkit/tools';
import { IWeappAppConfig, IWeappComponentConfig, IWeappPageConfig } from '@weapp-toolkit/weapp-types';
import { Handler, HandlerRunner } from '../handler-runner';

export class JsonHandler<T> implements Handler<T> {
  static HANDLER_NAME = 'JsonHandler';

  apply(runner: HandlerRunner<T>): void {
    const { loaderContext, appRoot, placeholderMap, dependencyGraph, resolver } = runner;
    const { resourcePath } = loaderContext;

    runner.hooks.analysisCode.tap(JsonHandler.HANDLER_NAME, (code) => {
      /** 后面直接读取 json 对象键值对处理 */
      return { assets: [], code };
    });

    runner.hooks.afterHandleAssets.tap(JsonHandler.HANDLER_NAME, (code) => {
      const filename = path.relative(appRoot, resourcePath);
      const json: IWeappComponentConfig | IWeappPageConfig | IWeappAppConfig = JSON.parse(code);
      const { usingComponents } = json;

      if (usingComponents) {
        /** 从 GraphNode 获取 usingComponents 绝对路径键值对 */
        const node = dependencyGraph.graphNodeIndex.getNodeByRequest(resourcePath);
        const components = node?.components || new Map<string, string>();

        components.forEach((reference, key) => {
          const placeholder = `___JSON_DEPENDENCY_${shortid()}___`;
          /** 记录占位符和资源的映射，在还原的时候需要**特别兼容** json 类型文件，去掉后缀名 */
          placeholderMap.set(placeholder, {
            reference,
            shouldRemoveExt: true,
          });

          usingComponents[key] = placeholder;
        });
      }

      if ('tabBar' in json) {
        json.tabBar?.list.forEach((tabBarItem) => {
          const { iconPath, selectedIconPath } = tabBarItem;

          const iconPlaceholder = getTabBarIconPlaceholder(iconPath);
          const selectedIconPlaceholder = getTabBarIconPlaceholder(selectedIconPath);

          if (iconPlaceholder) {
            tabBarItem.iconPath = iconPlaceholder;
          }

          if (selectedIconPlaceholder) {
            tabBarItem.selectedIconPath = selectedIconPlaceholder;
          }
        });
      }

      /** 生成文件 */
      loaderContext.emitFile(filename, JSON.stringify(json), undefined, {
        placeholderMap: runner.placeholderMap,
      });

      /** json 需要透传给 webpack */
      return code;
    });

    function getTabBarIconPlaceholder(iconPath?: string) {
      if (!iconPath) {
        return;
      }

      const node = dependencyGraph.graphNodeIndex.getNodeByRequest(resolver.resolveDependencySync(appRoot, iconPath));

      if (!node) {
        throw new Error(`[${JsonHandler.HANDLER_NAME}] 找不到 TabBar icon 的图节点：${iconPath}`);
      }

      const reference = node.resourcePath;

      const placeholder = `___JSON_DEPENDENCY_${shortid()}___`;
      /** 记录占位符和资源的映射，在还原的时候需要**特别兼容** json 类型文件，去掉后缀名 */
      placeholderMap.set(placeholder, {
        reference,
        shouldRemoveExt: true,
      });

      return placeholder;
    }
  }
}
