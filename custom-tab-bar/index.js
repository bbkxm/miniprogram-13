const app = getApp();

Component({
  data: {
    value: '', // 初始值设置为空，避免第一次加载时闪烁
    unreadNum: 0, // 未读消息数量
    list: [
      {
        icon: 'home',
        value: 'index',
        label: '活动广场',
      },
      {
        icon: 'location',
        value: 'map',
        label: '打卡地图',
      },      
      {
        icon: 'user',
        value: 'profile',
        label: '我的',
      },
    ],
  },
  lifetimes: {
    ready() {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];
      if (curPage) {
        const nameRe = /pages\/(\w+)\/index/.exec(curPage.route);
        if (nameRe === null) return;
        if (nameRe[1] && nameRe) {
          this.setData({
            value: nameRe[1],
          });
        }
      }
    },
  },
  methods: {
    handleChange(e) {
      const { value } = e.detail;
      wx.switchTab({ url: `/pages/${value}/index` });
    },

    /** 设置未读消息数量 */
    setUnreadNum(unreadNum) {
      this.setData({ unreadNum });
    },
  },
});
