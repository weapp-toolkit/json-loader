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

interface MethodTypes {
  // [key: string]: (...args: any[]) => any;
}
<% } else { %>
// typings
import { DataTypes, MethodTypes } from './<%=name%>.d';
<% } %>
Page<DataTypes, MethodTypes>({
  /**
   * 页面的初始数据
   */
  data: {},

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {},

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {},

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {},

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {},

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {},

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '分享标题',
      path: '分享路径',
      imageUrl: '分享头图',
    };
  },
});

// 让 ts 把文件当成模块处理，而不是当成声明
export {};
