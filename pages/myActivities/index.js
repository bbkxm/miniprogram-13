// 引入API
const api = require('../../utils/api.js')

Page({
  data: {
    currentTab: 'created', // created: 我创建的, joined: 我加入的
    activities: [],
    loading: true
  },

  onLoad: function (options) {
    // 如果有传入的tab参数，使用传入的，否则默认显示"我创建的"
    if (options.tab && (options.tab === 'created' || options.tab === 'joined')) {
      this.setData({ currentTab: options.tab })
    }
    this.loadActivities()
  },

  onShow: function() {
    // 页面显示时刷新数据
    if (!this.data.loading) {
      this.loadActivities()
    }
  },

  onPullDownRefresh: function() {
    this.loadActivities()
    wx.stopPullDownRefresh()
  },

  // 切换标签
  switchTab: function(e) {
    const type = e.currentTarget.dataset.type
    if (type !== this.data.currentTab) {
      this.setData({ 
        currentTab: type,
        loading: true 
      }, () => {
        this.loadActivities()
      })
    }
  },

  // 加载活动列表
  loadActivities: function() {
    const type = this.data.currentTab
    
    api.getUserActivities({ type })
      .then(res => {
        if (res && res.data) {
          this.setData({
            activities: Array.isArray(res.data) ? res.data : [],
            loading: false
          })
        }
      })
      .catch(err => {
        console.error('获取活动列表失败', err)
        this.setData({ loading: false })
        wx.showToast({
          title: '获取活动失败',
          icon: 'none'
        })
      })
  },

  // 跳转到活动详情
  navigateToDetail: function(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/activity/index?id=${id}`
    })
  },

  // 跳转到发起活动
  navigateToCreate: function() {
    wx.navigateTo({
      url: '/pages/publishActivity/index'
    })
  },

  // 跳转到活动广场
  navigateToExplore: function() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
}) 