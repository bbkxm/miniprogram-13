// 引入API
const api = require('../../utils/api.js')

Page({
  data: {
    userInfo: {
      id: 2,
      nickname: '山野行者',
      avatar: '/images/avatar2.jpg'
    },
    activities: [],
    currentTab: 'joined', // joined: 已加入, created: 已创建
    loading: true,
    tabs: [
      { id: 'joined', name: '已加入' },
      { id: 'created', name: '已创建' }
    ]
  },

  onLoad: function (options) {
    this.getActivities()
  },

  onShow: function() {
    // 页面从后台切换到前台时刷新数据
    if (!this.data.loading) {
      this.getActivities()
    }
  },

  onPullDownRefresh: function() {
    this.getActivities()
    wx.stopPullDownRefresh()
  },

  // 获取用户活动列表
  getActivities: function() {
    this.setData({ loading: true })
    
    // 直接获取所有活动，不需要先调用getUserActivities
    api.getActivities()
      .then(res => {
        if (res && res.data) {
          const allActivities = res.data;
          
          // 确保allActivities是数组
          if (Array.isArray(allActivities)) {
            // 模拟一些已加入和已创建的活动
            const joinedActivities = allActivities.filter(a => a.id === 1);
            const createdActivities = allActivities.filter(a => a.id === 2);
            
            this.setData({
              'activities.joined': joinedActivities,
              'activities.created': createdActivities,
              loading: false
            });
          } else {
            console.error('活动数据不是数组', allActivities);
            this.setData({ loading: false });
            wx.showToast({
              title: '数据格式错误',
              icon: 'none'
            });
          }
        } else {
          this.setData({ loading: false });
        }
      })
      .catch(err => {
        console.error('获取活动列表失败', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '获取活动失败',
          icon: 'none'
        });
      });
  },

  // 切换Tab
  switchTab: function(e) {
    const tabId = e.currentTarget.dataset.id
    if (tabId !== this.data.currentTab) {
      this.setData({ currentTab: tabId })
    }
  },

  // 跳转到活动详情
  navigateToDetail: function(e) {
    const activityId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/activityDetail/activityDetail?id=' + activityId
    })
  },

  // 跳转到发布活动页面
  navigateToPublish: function() {
    wx.navigateTo({
      url: '/pages/publishActivity/publishActivity'
    })
  },

  // 修改用户信息
  editUserInfo: function() {
    wx.showActionSheet({
      itemList: ['修改头像', '修改昵称'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 修改头像
          this.chooseAvatar()
        } else if (res.tapIndex === 1) {
          // 修改昵称
          this.editNickname()
        }
      }
    })
  },

  // 选择头像
  chooseAvatar: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 模拟上传头像
        setTimeout(() => {
          this.setData({
            'userInfo.avatar': res.tempFilePaths[0]
          })
          
          wx.showToast({
            title: '头像修改成功',
            icon: 'success'
          })
        }, 1000)
      }
    })
  },

  // 修改昵称
  editNickname: function() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新昵称',
      success: (res) => {
        if (res.confirm && res.content) {
          this.setData({
            'userInfo.nickname': res.content
          })
          
          wx.showToast({
            title: '昵称修改成功',
            icon: 'success'
          })
        }
      }
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
          // wx.clearStorageSync()
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success',
            duration: 1500,
            success: () => {
              // 这里可以根据实际需求进行页面跳转
              // 例如跳转到登录页面
            }
          })
        }
      }
    })
  }
}) 