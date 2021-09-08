// 网络中断提醒
wx.onNetworkStatusChange(({ isConnected }) => {
  if (!isConnected) {
    wx.showModal({
      title: '提示',
      content: '网络连接中断了，可能会影响到您的使用噢',
      confirmColor: '#009eef',
      confirmText: '知道了',
      showCancel: false,
    });
  }
});

App({
  globalData: {},

  onLaunch(options) {},

  onPageNotFound() {
    wx.redirectTo({
      url: 'pages/index/index',
    });
  },
});
