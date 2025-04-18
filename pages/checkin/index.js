// 引入API和工具
const api = require('../../utils/api.js')
const util = require('../../utils/util.js')

Page({
  data: {
    activityId: null,
    activity: null,
    loading: true,
    userLocation: null,
    inRange: false,
    checkpointId: null,
    nearestCheckpoint: null,
    distance: null,
    distanceText: '',
    text: '',
    images: [],
    submitting: false
  },

  onLoad: function (options) {
    if (options.activityId) {
      this.setData({ activityId: parseInt(options.activityId) })
      this.loadActivityDetail()
      this.getUserLocation()
    } else {
      wx.showToast({
        title: '活动ID不存在',
        icon: 'none',
        success: () => {
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        }
      })
    }
  },

  // 加载活动详情
  loadActivityDetail: function() {
    this.setData({ loading: true })

    api.getActivityDetail(this.data.activityId)
      .then(res => {
        if (res && res.data) {
          this.setData({ 
            activity: res.data,
            loading: false
          })
          
          // 如果已有用户位置，计算与打卡点的距离
          if (this.data.userLocation) {
            this.calculateDistanceToCheckpoints()
          }
        }
      })
      .catch(err => {
        console.error('获取活动详情失败', err)
        this.setData({ loading: false })
        wx.showToast({
          title: '获取活动详情失败',
          icon: 'none'
        })
      })
  },

  // 获取用户位置
  getUserLocation: function() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const location = {
          latitude: res.latitude,
          longitude: res.longitude
        }
        this.setData({ userLocation: location })
        
        // 如果已有活动信息，计算与打卡点的距离
        if (this.data.activity) {
          this.calculateDistanceToCheckpoints()
        }
      },
      fail: (err) => {
        console.error('获取位置失败', err)
        wx.showToast({
          title: '获取位置失败，请授权位置权限',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // 刷新位置
  refreshLocation: function() {
    wx.showLoading({ title: '获取位置中...' })
    
    this.getUserLocation()
    
    setTimeout(() => {
      wx.hideLoading()
    }, 1000)
  },

  // 计算与各打卡点的距离
  calculateDistanceToCheckpoints: function() {
    const { userLocation, activity } = this.data
    if (!userLocation || !activity || !activity.checkpoints) return
    
    let nearestCheckpoint = null
    let minDistance = Infinity
    
    activity.checkpoints.forEach(checkpoint => {
      const distance = util.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        checkpoint.coordinates.latitude,
        checkpoint.coordinates.longitude
      )
      
      if (distance < minDistance) {
        minDistance = distance
        nearestCheckpoint = checkpoint
      }
    })
    
    // 设置最近的打卡点和距离
    const inRange = minDistance <= 100 // 100米内可打卡
    
    // 格式化距离文本
    const distanceText = minDistance < 1000 ? 
      Math.round(minDistance) + 'm' : 
      (minDistance / 1000).toFixed(2) + 'km';
    
    this.setData({
      nearestCheckpoint,
      distance: minDistance,
      distanceText,
      inRange,
      checkpointId: nearestCheckpoint ? nearestCheckpoint.id : null
    })
  },

  // 输入打卡文字
  onInputText: function(e) {
    this.setData({ text: e.detail.value })
  },

  // 选择图片
  chooseImage: function() {
    const { images } = this.data
    const remainCount = 9 - images.length
    
    if (remainCount <= 0) {
      wx.showToast({
        title: '最多添加9张图片',
        icon: 'none'
      })
      return
    }
    
    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = [...images, ...res.tempFilePaths]
        this.setData({ images: newImages })
      }
    })
  },

  // 预览图片
  previewImage: function(e) {
    const current = e.currentTarget.dataset.src
    wx.previewImage({
      current,
      urls: this.data.images
    })
  },

  // 删除图片
  deleteImage: function(e) {
    const index = e.currentTarget.dataset.index
    const { images } = this.data
    
    images.splice(index, 1)
    this.setData({ images })
  },

  // 提交打卡
  submitCheckin: function() {
    const { userLocation, checkpointId, text, images, inRange, activityId } = this.data
    
    // 验证
    if (!userLocation) {
      wx.showToast({
        title: '请先获取位置',
        icon: 'none'
      })
      return
    }
    
    if (!inRange) {
      wx.showToast({
        title: '不在打卡点范围内',
        icon: 'none'
      })
      return
    }
    
    // 开始提交
    this.setData({ submitting: true })
    
    const data = {
      activityId,
      checkpointId,
      text,
      images,
      coordinates: userLocation,
      createdAt: new Date().toISOString()
    }
    
    // 模拟上传图片
    const uploadImages = () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(images)
        }, 1000)
      })
    }
    
    // 先上传图片，再提交打卡
    uploadImages()
      .then((imageUrls) => {
        data.images = imageUrls
        return api.createCheckin(data)
      })
      .then(res => {
        this.setData({ submitting: false })
        
        if (res && res.data && res.data.success) {
          wx.showToast({
            title: '打卡成功',
            icon: 'success',
            duration: 1500,
            success: () => {
              setTimeout(() => {
                wx.navigateBack()
              }, 1500)
            }
          })
        }
      })
      .catch(err => {
        console.error('打卡失败', err)
        this.setData({ submitting: false })
        
        wx.showToast({
          title: '打卡失败',
          icon: 'none'
        })
      })
  }
}) 