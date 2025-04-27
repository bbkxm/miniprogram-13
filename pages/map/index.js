// 引入API和工具
const api = require('../../utils/api.js')
const util = require('../../utils/util.js')

Page({
  data: {
    activityId: null,      // 当前活动ID
    markers: [],           // 地图标记点
    polyline: [],          // 路线数据
    userLocation: null,    // 用户位置
    scale: 14,             // 地图缩放级别
    loading: true,         // 加载状态
    checkins: [],          // 打卡记录
    // 新增筛选相关数据
    showFilterPanel: false, // 是否显示筛选面板
    activityTypes: ['全部', '跑步', '骑行', '徒步', '其他'], // 活动类型列表
    activityTypeIndex: 0,  // 当前选中的活动类型索引
    startDate: '',         // 开始日期
    endDate: '',           // 结束日期
    originalCheckins: [],  // 原始打卡记录
    showSearch: false,     // 是否显示搜索框
    searchKeyword: '',     // 搜索关键词
  },

  onLoad: function (options) {
    console.log('地图页面参数:', options)
    
    // 加载用户位置
    this.getUserLocation()
    
    this.loadCheckins()
  },

  onShow: function() {
    console.log('地图页面显示')
    // 每次显示页面时都重新加载打卡点
    this.loadCheckins()
  },
  
  // 下拉刷新
  onPullDownRefresh: function() {
    if (this.data.activityId) {
      this.loadCheckins()
    }
    wx.stopPullDownRefresh()
  },

  // 加载打卡记录
  loadCheckins: function(keyword = '') {
    this.setData({ loading: true })

    const params = {
      searchKeyword: keyword    
    }

    api.getCheckins(params)
      .then(res => {
        if (res && res.data) {
          console.log('获取到打卡记录:', res.data)
          
          // 保存原始数据
          this.setData({
            originalCheckins: res.data
          })
          
          // 构建地图标记点
          const markers = res.data.map((checkin, index) => {
            return {
              id: Number(checkin.id),
              activityId: checkin.activityId,
              latitude: Number(checkin.latitude),
              longitude: Number(checkin.longitude),
              title: checkin.creator.nickname + '在【' + checkin.activity.title + '】活动' || '打卡点',
              callout: {
                content: checkin.creator.nickname + '在【' + checkin.activity.title + '】活动' || '打卡点',
                color: '#000000',
                fontSize: 14,
                borderRadius: 4,
                padding: 5,
                display: 'ALWAYS'
              },
              label: {
                content: (index + 1).toString(),
                color: '#FFFFFF',
                fontSize: 14,
                anchorX: 0,
                anchorY: 0,
                textAlign: 'center'
              },
              anchor: {
                x: 0.5,
                y: 1
              }
            }
          })
          
          this.setData({ 
            checkins: res.data,
            markers,
            loading: false
          }, () => {
            // 在 setData 的回调中添加用户位置标记
            if (this.data.userLocation) {
              this.addUserLocationMarker()
            }
            
            // 确保地图上下文存在
            if (!this.mapCtx) {
              this.mapCtx = wx.createMapContext('map')
            }
            
            // 延迟调整视野，确保所有标记点都已添加
            setTimeout(() => {
              this.includeAllMarkers()
            }, 1000)
          })
        } else {
          this.setData({ loading: false })
          wx.showToast({
            title: '没有打卡记录',
            icon: 'none'
          })
        }
      })
      .catch(err => {
        console.error('获取打卡记录失败', err)
        this.setData({ loading: false })
        wx.showToast({
          title: '获取打卡记录失败',
          icon: 'none'
        })
      })
  },

  // 获取用户位置
  getUserLocation: function() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          userLocation: {
            latitude: res.latitude,
            longitude: res.longitude
          }
        })
        
        // 添加用户位置标记
        this.addUserLocationMarker()
      },
      fail: (err) => {
        console.error('获取位置失败', err)
        
        // 判断是否是权限问题
        if (err.errMsg.indexOf('auth deny') >= 0 || err.errCode === 2 || err.errMsg.indexOf('permission') >= 0) {
          // 显示对话框引导用户开启权限
          wx.showModal({
            title: '需要位置权限',
            content: '地图功能需要获取您的位置信息，请授权位置权限',
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
            icon: 'none'
          })
        }
      }
    })
  },
  
  // 添加用户位置标记
  addUserLocationMarker: function() {
    if (!this.data.userLocation) return
    
    const userMarker = {
      id: 0, // 用户位置标记的ID固定为0
      latitude: this.data.userLocation.latitude,
      longitude: this.data.userLocation.longitude,
      title: '当前位置',
      iconPath: '/images/user_location.png',
      width: 30,
      height: 30,
      callout: {
        content: '当前位置',
        color: '#000000',
        fontSize: 14,
        borderRadius: 4,
        padding: 5,
        display: 'BYCLICK'
      },
      anchor: {
        x: 0.5,
        y: 0.5
      }
    }
    
    // 过滤掉原有的用户位置标记
    const filteredMarkers = this.data.markers.filter(m => m.id !== 0)
    const markers = [...filteredMarkers, userMarker]
    
    this.setData({ markers })
  },

  // 刷新位置
  refreshLocation: function() {
    wx.showLoading({ title: '获取位置中...' })
    
    this.getUserLocation()
    
    setTimeout(() => {
      wx.hideLoading()
    }, 1000)
  },

  // 定位到用户位置
  moveToLocation: function() {
    console.log('开始定位到用户位置')
    console.log('当前用户位置:', this.data.userLocation)
    console.log('地图上下文:', this.mapCtx)
    
    if (!this.data.userLocation) {
      console.log('用户位置不存在，尝试获取位置')
      this.getUserLocation()
      return
    }

    if (!this.mapCtx) {
      console.log('地图上下文不存在，尝试创建')
      this.mapCtx = wx.createMapContext('map')
      if (!this.mapCtx) {
        console.log('创建地图上下文失败')
        return
      }
    }
    
    // 先设置地图中心点为用户位置
    console.log('设置地图中心点:', {
      latitude: this.data.userLocation.latitude,
      longitude: this.data.userLocation.longitude,
      scale: 16
    })
    
    this.setData({
      latitude: this.data.userLocation.latitude,
      longitude: this.data.userLocation.longitude,
      scale: 16  // 设置一个合适的缩放级别
    }, () => {
      console.log('地图中心点设置完成')
      // 延迟一下，确保地图中心点已经更新
      setTimeout(() => {
        console.log('开始调用 moveToLocation')
        // 调用 moveToLocation 方法
        this.mapCtx.moveToLocation({
          latitude: this.data.userLocation.latitude,
          longitude: this.data.userLocation.longitude,
          success: () => {
            console.log('移动到用户位置成功')
          },
          fail: (err) => {
            console.error('移动到用户位置失败', err)
          }
        })
      }, 100)
    })
  },

  // 视野包含所有标记点
  includeAllMarkers: function() {
    console.log('开始调整视野包含所有标记点')
    console.log('当前标记点数量:', this.data.markers ? this.data.markers.length : 0)
    console.log('当前用户位置:', this.data.userLocation)
    console.log('地图上下文:', this.mapCtx)
    
    if (!this.mapCtx) {
      console.log('地图上下文不存在，尝试创建')
      this.mapCtx = wx.createMapContext('map')
      if (!this.mapCtx) {
        console.log('创建地图上下文失败，延迟重试')
        setTimeout(() => {
          this.includeAllMarkers()
        }, 500)
        return
      }
    }
    
    if (!this.data.markers || this.data.markers.length === 0) {
      console.log('没有标记点，尝试移动到用户位置')
      // 如果没有标记点，则直接返回或移动到用户位置
      if (this.data.userLocation) {
        this.moveToLocation()
      }
      return
    }
    
    // 使用 includePoints 方法使视野包含所有标记点
    const points = this.data.markers.map(marker => ({
      latitude: Number(marker.latitude),
      longitude: Number(marker.longitude)
    }))
    
    // 添加用户位置（如果存在）
    if (this.data.userLocation) {
      points.push(this.data.userLocation)
    }
    
    console.log('要包含的点:', points)
    
    // 先调整缩放级别
    console.log('设置地图缩放级别为 12')
    this.setData({
      scale: 12  // 设置一个较小的缩放级别，确保能看到更大的范围
    }, () => {
      console.log('地图缩放级别设置完成')
      // 延迟一下，确保缩放级别已经生效
      setTimeout(() => {
        console.log('开始调用 includePoints')
        this.mapCtx.includePoints({
          points: points,
          padding: [200, 200, 200, 200]
        })
      }, 100)
    })
  },

  // 点击标记点
  markerTap: function(e) {
    const markerId = Number(e.markerId)
    
    // 如果是用户位置标记(id为0)，不做处理
    if (markerId === 0) return
    
    // 找到对应的打卡记录
    const checkin = this.data.checkins.find(c => Number(c.id) === markerId)
    if (!checkin) return
    
    let content = `打卡点: ${checkin.location || '未知位置'}\n`
    content += `打卡时间: ${checkin.checkinTime}\n`
    if (checkin.text) {
      content += `备注: ${checkin.text}`
    }
    
    wx.showModal({
      title: '打卡详情',
      content: content,
      confirmText: checkin.images && checkin.images.length > 0 ? '查看图片' : '关闭',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm && checkin.images && checkin.images.length > 0) {
          // 验证图片 URLs
          const validImages = checkin.images.filter(url => {
            return url && typeof url === 'string' && url.trim() !== ''
          })

          if (validImages.length === 0) {
            wx.showToast({
              title: '没有有效的图片',
              icon: 'none'
            })
            return
          }

          // 查看打卡图片
          wx.previewImage({
            urls: validImages,
            success: () => {
              console.log('图片预览成功')
            },
            fail: (err) => {
              console.error('图片预览失败:', err)
              wx.showToast({
                title: '图片加载失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  // 地图加载完成
  mapLoaded: function() {
    console.log('地图加载完成')
    this.mapCtx = wx.createMapContext('map')
    console.log('创建地图上下文:', this.mapCtx)
    
    // 延迟一下，确保地图已准备好
    setTimeout(() => {
      console.log('地图准备就绪，开始调整视野')
      // 只有在有标记点的情况下才执行includeAllMarkers
      if (this.data.markers && this.data.markers.length > 0) {
        this.includeAllMarkers()
      } else if (this.data.userLocation) {
        // 如果没有标记点但有用户位置，则移动到用户位置
        this.moveToLocation()
      }
    }, 1000)  // 增加延迟时间到 1000ms
  },

  // 切换筛选面板显示状态
  toggleFilterPanel: function() {
    this.setData({
      showFilterPanel: !this.data.showFilterPanel,
      showSearch: false,
      searchKeyword: ''  // 清空搜索关键词
    })
  },

  // 活动类型改变
  onActivityTypeChange: function(e) {
    this.setData({
      activityTypeIndex: e.detail.value
    })
  },

  // 开始日期改变
  onStartDateChange: function(e) {
    this.setData({
      startDate: e.detail.value
    })
  },

  // 结束日期改变
  onEndDateChange: function(e) {
    this.setData({
      endDate: e.detail.value
    })
  },

  // 重置筛选条件
  resetFilters: function() {
    this.setData({
      activityTypeIndex: 0,
      startDate: '',
      endDate: ''
    })
    this.applyFilters()
  },

  // 应用筛选条件
  applyFilters: function() {
    let filteredCheckins = [...this.data.originalCheckins]

    // 按活动类型筛选
    if (this.data.activityTypeIndex > 0) {
      const selectedType = this.data.activityTypes[this.data.activityTypeIndex]
      filteredCheckins = filteredCheckins.filter(checkin => 
        checkin.activityType === selectedType
      )
    }

    // 按日期范围筛选
    if (this.data.startDate) {
      const startTime = new Date(this.data.startDate).getTime()
      filteredCheckins = filteredCheckins.filter(checkin => 
        new Date(checkin.checkinTime).getTime() >= startTime
      )
    }

    if (this.data.endDate) {
      const endTime = new Date(this.data.endDate).getTime()
      filteredCheckins = filteredCheckins.filter(checkin => 
        new Date(checkin.checkinTime).getTime() <= endTime
      )
    }

    // 更新地图标记点
    const markers = filteredCheckins.map((checkin, index) => {
      return {
        id: Number(checkin.id),
        activityId: checkin.activityId,
        latitude: Number(checkin.latitude),
        longitude: Number(checkin.longitude),
        title: checkin.creator.nickname + '在【' + checkin.activity.title + '】活动' || '打卡点',
        callout: {
          content: checkin.creator.nickname + '在【' + checkin.activity.title + '】活动' || '打卡点',
          color: '#000000',
          fontSize: 14,
          borderRadius: 4,
          padding: 5,
          display: 'ALWAYS'
        },
        label: {
          content: (index + 1).toString(),
          color: '#FFFFFF',
          fontSize: 14,
          anchorX: 0,
          anchorY: 0,
          textAlign: 'center'
        },
        anchor: {
          x: 0.5,
          y: 1
        }
      }
    })

    this.setData({
      checkins: filteredCheckins,
      markers,
      showFilterPanel: false
    }, () => {
      // 在 setData 的回调中添加用户位置标记
      if (this.data.userLocation) {
        this.addUserLocationMarker()
      }
      
      // 调整视野以包含所有标记点
      this.includeAllMarkers()
    })
  },

  // 切换搜索框显示状态
  toggleFilterPanel: function() {
    this.setData({
      showSearch: !this.data.showSearch,
      searchKeyword: ''  // 清空搜索关键词
    })
  },

  // 搜索输入
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
  },

  // 搜索确认
  onSearchConfirm: function() {
    const keyword = this.data.searchKeyword.trim()
    this.loadCheckins(keyword)
    this.setData({
      showSearch: false
    })
  },
}) 