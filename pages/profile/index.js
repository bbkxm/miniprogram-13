// 引入API
const api = require('../../utils/api.js')

Page({
  data: {
    userInfo: {
      userId: null,
      nickname: '',
      avatar: ''
    },
    activities: {
      joined: [],
      created: []
    },
    loading: true
  },

  onLoad: function (options) {
    // 检查用户是否已登录
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.userId) {
      this.setData({
        userInfo: userInfo
      })
    }
    this.loadActivities()
  },

  onShow: function() {
    // 页面从后台切换到前台时刷新数据
    if (!this.data.loading) {
      this.loadActivities()
    }
  },

  onPullDownRefresh: function() {
    this.loadActivities()
    wx.stopPullDownRefresh()
  },

  // 加载活动数据
  loadActivities: function() {
    this.setData({ loading: true })
    
    // 获取已加入的活动
    api.getUserActivities({ type: 'joined' })
      .then(res => {
        if (res && res.data) {
          this.setData({
            'activities.joined': Array.isArray(res.data) ? res.data : []
          })
        }
      })
      .catch(err => {
        console.error('获取已加入活动失败', err)
      })

    // 获取已创建的活动
    api.getUserActivities({ type: 'created' })
      .then(res => {
        if (res && res.data) {
          this.setData({
            'activities.created': Array.isArray(res.data) ? res.data : [],
            loading: false
          })
        }
      })
      .catch(err => {
        console.error('获取已创建活动失败', err)
        this.setData({ loading: false })
      })
  },

  // 导航到我的活动
  navigateToMyActivities: function() {
    wx.navigateTo({
      url: '/pages/myActivities/index'
    })
  },

  // 退出登录
  logout: function() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储的用户信息和令牌
          wx.clearStorageSync()
          this.setData({
            userInfo: {
              userId: null,
              nickname: '',
              avatar: ''
            }
          })
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  },

  navigateToMyCreated() {
    wx.navigateTo({
      url: '/pages/myActivities/index?tab=created'
    })
  },

  navigateToMyJoined() {
    wx.navigateTo({
      url: '/pages/myActivities/index?tab=joined'
    })
  },

  // 获取用户信息
  onGetUserInfo: function() {
    // 调用微信登录
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        if (res.userInfo) {
          // 获取到用户信息
          const userInfo = res.userInfo
          wx.login({
            success: (loginRes) => {
              if (loginRes.code) {
                // 这里可以发送 code 到后端换取 openId 和 session_key
                // 示例中直接使用微信返回的用户信息
                const userData = {
                  ...userInfo,
                  userId: null // 实际应该使用后端返回的用户ID
                }
                // 保存用户信息到本地存储
                wx.setStorageSync('userInfo', userData)
                this.setData({
                  userInfo: userData
                })
              }
            }
          })
        }
      },
      fail: () => {
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        })
      }
    })
  }
}) 