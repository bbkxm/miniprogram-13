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
      // Keep activityId as string to match API expectations
      this.setData({ activityId: options.activityId })
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
          longitude: res.longitude,
          name: '正在获取位置名称...'  // 初始占位文本
        }
        this.setData({ userLocation: location })
        
        // 获取位置名称 (反向地理编码)
        this.getLocationName(res.latitude, res.longitude)
        
        // 如果已有活动信息，计算与打卡点的距离
        if (this.data.activity) {
          this.calculateDistanceToCheckpoints()
        }
      },
      fail: (err) => {
        console.error('获取位置失败', err)
        
        // 判断是否是权限问题
        if (err.errMsg.indexOf('auth deny') >= 0 || err.errCode === 2 || err.errMsg.indexOf('permission') >= 0) {
          // 显示对话框引导用户开启权限
          wx.showModal({
            title: '需要位置权限',
            content: '打卡功能需要获取您的位置信息，请授权位置权限',
            confirmText: '去设置',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                // 打开设置页面
                wx.openSetting({
                  success: (settingRes) => {
                    if (settingRes.authSetting['scope.userLocation']) {
                      // 用户已授权，重新获取位置
                      this.getUserLocation()
                    }
                  }
                })
              }
            }
          })
        } else {
          // 其他错误
          wx.showToast({
            title: '获取位置失败，请检查GPS是否开启',
            icon: 'none',
            duration: 2000
          })
        }
      }
    })
  },

  // 刷新位置
  refreshLocation: function() {
    wx.showLoading({ title: '获取位置中...' })
    
    this.getUserLocation()
    
    setTimeout(() => {
      wx.hideLoading()
    }, 1500)
  },

  // 获取位置名称
  getLocationName: function(latitude, longitude) {
      // 临时设置一个默认名称，避免API调用问题
      this.setData({
        'userLocation.name': `位置(${latitude.toFixed(6)}, ${longitude.toFixed(6)})`
      });
    // // 使用微信小程序提供的逆地理编码接口
    // wx.request({
    //   url: 'https://apis.map.qq.com/ws/geocoder/v1/',
    //   data: {
    //     location: latitude + ',' + longitude,
    //     key: 'SXZBZ-GZYWZ-AAJXE-7NCSZ-5ULKJ-EEFGG',  // 使用演示Key，实际使用中需替换为自己的腾讯地图key
    //     get_poi: 0
    //   },
    //   success: (res) => {
    //     if (res.data && res.data.status === 0 && res.data.result) {
    //       const addressComponent = res.data.result.address_component;
    //       const formatted_addresses = res.data.result.formatted_addresses;
    //       const name = formatted_addresses?.recommend || res.data.result.address;
          
    //       this.setData({
    //         'userLocation.name': name
    //       });
    //     }
    //   },
    //   fail: (err) => {
    //     console.error('获取位置名称失败', err);
    //     this.setData({
    //       'userLocation.name': '未知位置'
    //     });
    //   }
    // });
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
        checkpoint.latitude,
        checkpoint.longitude
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
    
    // 验证打卡内容
    if (!text || text.trim() === '') {
      wx.showToast({
        title: '请填写打卡内容',
        icon: 'none'
      })
      return
    }

    // 验证打卡图片
    if (!images || images.length === 0) {
      wx.showToast({
        title: '请至少上传一张图片',
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
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      location: userLocation.name,
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
        
        if (res && res.data) {
          console.log('打卡成功，准备返回上一页');
          
          // 先显示提示
          wx.showToast({
            title: '打卡成功',
            icon: 'success',
            duration: 1500
          });
          
          // 确保导航操作在提示显示后执行，但不依赖于提示的回调
          setTimeout(() => {
            console.log('尝试返回上一页');
            wx.navigateBack({
              success: () => console.log('导航返回成功'),
              fail: (err) => {
                console.log('无法返回，将重定向到活动页');
                // 如果没有上一页，则跳转到活动页面
                if (this.data.activityId) {
                  wx.redirectTo({
                    url: `/pages/activity/index?id=${this.data.activityId}`
                  });
                } else {
                  // 如果没有活动ID，则跳转到主页
                  wx.switchTab({
                    url: '/pages/index/index'
                  });
                }
              }
            });
          }, 1500);
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