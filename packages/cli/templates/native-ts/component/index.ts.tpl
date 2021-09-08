/**
 * @module <%=name%>
 * @author <%=gitName%>
 * @email <%=gitEmail%>
 * @date <%=dateTime%>
 */
<% if (typeInline) { %>
interface DataTypes {
  // [key: string]: any;
}

interface PropsTypes {
  // [key: string]: any;
}

interface MethodTypes {
  // [key: string]: (...args: any[]) => any;
}
<% } else { %>
// typings
import { DataTypes, PropsTypes, MethodTypes } from './<%=name%>.d';
<% } %>
Component<DataTypes, PropsTypes, MethodTypes>({
  options: {
    addGlobalClass: true,
  },

  properties: {},

  data: {},

  observers: {},

  lifetimes: {},

  methods: {},
});

// 让 ts 把文件当成模块处理，而不是当成声明
export {};
