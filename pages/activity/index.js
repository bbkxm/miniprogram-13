// 引入API和工具
const api = require('../../utils/api.js')
const util = require('../../utils/util.js')

Page({
  data: {
    id: null,
    activity: null,
    checkins: [],
    selectedCheckpointId: null,
    checkpointName: '',
    loading: true,
    userLocation: null,
    isCreator: false,
    hasJoined: false,
    tabs: [
      { id: 'info', name: '活动详情' },
      { id: 'checkins', name: '打卡记录' },
      { id: 'map', name: '打卡地图' }
    ],
    currentTab: 'info',
    mapMarkers: [],
    mapPolyline: [],
    mapLoaded: false
  },

  onLoad: function (options) {
    if (options.id) {
      // 保持ID为字符串，防止大数值精度丢失
      this.setData({ id: String(options.id) })
      
      // 记录选中的打卡点ID（如果有）
      if (options.checkpointId) {
        this.setData({ selectedCheckpointId: String(options.checkpointId) })
      }
      
      this.loadActivityDetail()
      this.loadCheckins()
      this.getUserLocation()
      
      // 如果有tab参数，则切换到对应的标签
      if (options.tab && (options.tab === 'info' || options.tab === 'checkins' || options.tab === 'map')) {
        this.setData({ currentTab: options.tab })
        // 如果是地图tab，初始化地图数据
        if (options.tab === 'map') {
          this.viewMap()
        } else if (options.tab === 'checkins') {
          this.loadCheckins()
        }
      }
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

    api.getActivityDetail(this.data.id)
      .then(res => {
        if (res && res.data) {
          // 模拟当前用户ID
          const currentUserId = 1
          const activity = res.data
          
          // 检查用户是否已加入活动，同时检查userId和id字段以保证兼容性
          const hasJoined = activity.participants.some(p => {
            return (p.userId == currentUserId)
          })

          console.log('用户ID:', currentUserId, '是否已加入:', hasJoined, '参与者列表:', activity.participants)

          this.setData({ 
            activity: activity,
            loading: false,
            hasJoined: hasJoined
          })

          // 如果当前是地图tab，初始化地图数据
          if (this.data.currentTab === 'map') {
            this.viewMap()
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

  // 加载打卡记录
  loadCheckins: function() {
    const params = {
      activityId: this.data.id,
    }
    api.getCheckins(params)
      .then(res => {
        if (res && res.data) {
          const checkins = res.data.map(checkin => {
            checkin.formattedTime = util.formatTimeFromNow(checkin.checkinTime)
            return checkin
          })
          this.setData({ checkins })
        }
      })
      .catch(err => {
        console.error('获取打卡记录失败', err)
      })
  },


  // 获取用户位置
  getUserLocation: function() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        console.log('获取用户位置成功:', res)
        this.setData({
          userLocation: {
            latitude: res.latitude,
            longitude: res.longitude
          }
        })
        // 如果当前是地图tab，更新地图中心点
        if (this.data.currentTab === 'map') {
          this.setData({
            latitude: res.latitude,
            longitude: res.longitude
          })
        }
      },
      fail: (err) => {
        console.error('获取用户位置失败:', err)
        wx.showModal({
          title: '位置权限',
          content: '需要获取您的位置信息以显示地图，请在设置中允许位置权限',
          showCancel: false
        })
      }
    })
  },

  // 切换Tab
  switchTab: function(e) {
    const tabId = e.currentTarget.dataset.id
    console.log('切换到', tabId)
    if (tabId !== this.data.currentTab) {
      this.setData({ currentTab: tabId })
      
      // 如果切换到地图tab，初始化地图数据
      if (tabId === 'map') {
        this.loadCheckins()
        // 延迟一下，确保地图组件已准备好
        setTimeout(() => {
          this.viewMap()
        }, 100)
      } else if (tabId === 'checkins') {
        this.loadCheckins()
      }
    }
  },

  // 加入活动
  joinActivity: function() {
    wx.showLoading({ title: '加入中...' })
    
    api.joinActivity(this.data.id)
      .then(res => {
        wx.hideLoading()
        if (res && res.data) {
          wx.showToast({
            title: '加入成功',
            icon: 'success'
          })
          
          // 重新加载活动详情
          this.loadActivityDetail()
        }
      })
      .catch(err => {
        wx.hideLoading()
        console.error('加入活动失败', err)
        wx.showToast({
          title: '加入失败',
          icon: 'none'
        })
      })
  },

  // 退出活动
  quitActivity: function() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出该活动吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '退出中...' })
          
          api.quitActivity(this.data.id)
            .then(res => {
              wx.hideLoading()
              if (res && res.data) {
                wx.showToast({
                  title: '已退出活动',
                  icon: 'success'
                })
                
                // 重新加载活动详情
                this.loadActivityDetail()
              }
            })
            .catch(err => {
              wx.hideLoading()
              console.error('退出活动失败', err)
              wx.showToast({
                title: '退出失败',
                icon: 'none'
              })
            })
        }
      }
    })
  },

  // 前往打卡
  goToCheckin: function() {
    wx.navigateTo({
      url: `/pages/checkin/index?activityId=${this.data.id}`
    })
  },

  // 查看打卡点地图
  viewMap: function() {
    console.log('开始查看地图，当前用户位置:', this.data.userLocation)
    
    // 直接从接口获取打卡记录
    const params = {
      activityId: this.data.id,
    }
    api.getCheckins(params)
      .then(res => {
        if (res && res.data) {
          console.log('获取到打卡记录:', res.data)
          
          // 构建地图标记点
          const mapMarkers = res.data.map((checkin, index) => {
            return {
              id: Number(checkin.id),
              latitude: Number(checkin.latitude),  // 确保是数字类型
              longitude: Number(checkin.longitude),  // 确保是数字类型
              title: checkin.location || '打卡点',
              width: 30,  // 添加宽度
              height: 30,  // 添加高度
              callout: {
                content: checkin.location || '打卡点',
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
              }
            }
          })
          
          // 构建路线
          const mapPolyline = []
          if (res.data.length >= 2) {
            const points = res.data.map(checkin => {
              return {
                latitude: Number(checkin.latitude),
                longitude: Number(checkin.longitude)
              }
            })
            
            mapPolyline.push({
              points,
              color: '#4285f4',
              width: 4,
              dottedLine: false,
              arrowLine: true
            })
          }
          
          // 设置地图中心点
          const centerLatitude = this.data.userLocation ? this.data.userLocation.latitude : undefined
          const centerLongitude = this.data.userLocation ? this.data.userLocation.longitude : undefined
          console.log('设置地图中心点:', { centerLatitude, centerLongitude })
          
          // 更新地图数据
          this.setData({
            checkins: res.data,  // 保存打卡记录数据
            mapMarkers,
            // mapPolyline,
            currentTab: 'map',
            latitude: centerLatitude,
            longitude: centerLongitude,
            scale: 16  // 设置一个合适的缩放级别
          }, () => {
            console.log('地图数据更新完成，当前中心点:', { 
              latitude: this.data.latitude, 
              longitude: this.data.longitude 
            })
            
            // 在 setData 的回调中添加用户位置标记
            if (this.data.userLocation) {
              console.log('添加用户位置标记:', this.data.userLocation)
              this.addUserLocationMarker()
            }
            
            // 确保地图上下文存在
            if (!this.mapCtx) {
              console.log('创建地图上下文')
              this.mapCtx = wx.createMapContext('activityMap')
            }
            
            // 延迟调整视野，确保所有标记点都已添加
            setTimeout(() => {
              if (this.mapCtx) {
                console.log('开始调整视野包含所有标记点')
                this.includeAllMarkers()
              } else {
                console.error('地图上下文创建失败')
              }
            }, 1000)
          })
        } else {
          wx.showToast({
            title: '没有打卡记录',
            icon: 'none'
          })
        }
      })
      .catch(err => {
        console.error('获取打卡记录失败', err)
        wx.showToast({
          title: '获取打卡记录失败',
          icon: 'none'
        })
      })
  },
  
  // 添加用户位置标记
  addUserLocationMarker: function() {
    if (!this.data.userLocation) return
    
    const userMarker = {
      id: 0,
      latitude: this.data.userLocation.latitude,
      longitude: this.data.userLocation.longitude,
      title: '当前位置',
      width: 25,
      height: 25,
      anchor: {x: .5, y: .5},
      callout: {
        content: '当前位置',
        color: '#000000',
        fontSize: 14,
        borderRadius: 4,
        padding: 5,
        display: 'BYCLICK'
      }
    }
    
    // 过滤掉原有的用户位置标记
    const filteredMarkers = this.data.mapMarkers.filter(m => m.id !== 0)
    
    this.setData({
      mapMarkers: [...filteredMarkers, userMarker]
    })
  },
  
  // 地图加载完成
  onMapLoad: function() {
    this.mapCtx = wx.createMapContext('activityMap')
    this.setData({ mapLoaded: true })
    
    // 延迟一下，确保地图已准备好
    setTimeout(() => {
      this.includeAllMarkers()
    }, 500)
  },
  
  // 视野包含所有标记点
  includeAllMarkers: function() {
    console.log('开始调整视野包含所有标记点')
    console.log('当前标记点数量:', this.data.mapMarkers ? this.data.mapMarkers.length : 0)
    console.log('当前用户位置:', this.data.userLocation)
    console.log('地图上下文:', this.mapCtx)
    
    const { mapMarkers } = this.data
    if (!this.mapCtx || mapMarkers.length === 0) {
      console.log('地图上下文不存在或没有标记点')
      return
    }
    
    // 确保标记点数据已经设置好
    if (mapMarkers.some(marker => !marker.latitude || !marker.longitude)) {
      console.log('标记点数据不完整，延迟重试')
      setTimeout(() => {
        this.includeAllMarkers()
      }, 500)
      return
    }
    
    console.log('调整地图视野，包含所有标记点:', mapMarkers)
    
    // 如果存在用户位置，先移动到用户位置
    if (this.data.userLocation) {
      console.log('先移动到用户位置:', this.data.userLocation)
      this.mapCtx.moveToLocation({
        latitude: this.data.userLocation.latitude,
        longitude: this.data.userLocation.longitude,
        success: () => {
          console.log('移动到用户位置成功')
          // 延迟一下，确保移动完成后再调整视野
          setTimeout(() => {
            // 先设置更小的缩放级别
            this.setData({
              scale: 10  // 设置更小的缩放级别，以显示更大范围
            }, () => {
              // 然后调整视野包含所有点
              this.mapCtx.includePoints({
                points: mapMarkers.map(marker => ({
                  latitude: Number(marker.latitude),
                  longitude: Number(marker.longitude)
                })),
                padding: [50, 50, 50, 50]  // 进一步减小padding值
              })
            })
          }, 500)
        }
      })
    } else {
      // 如果没有用户位置，直接调整视野
      this.setData({
        scale: 10  // 设置更小的缩放级别
      }, () => {
        this.mapCtx.includePoints({
          points: mapMarkers.map(marker => ({
            latitude: Number(marker.latitude),
            longitude: Number(marker.longitude)
          })),
          padding: [50, 50, 50, 50]  // 进一步减小padding值
        })
      })
    }
  },
  
  // 刷新位置
  refreshLocation: function() {
    wx.showLoading({ title: '获取位置中...' })
    
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
      complete: () => {
        wx.hideLoading()
      }
    })
  },
  
  // 定位到用户位置
  moveToLocation: function() {
    console.log('开始定位到用户位置')
    console.log('当前用户位置:', this.data.userLocation)
    console.log('地图上下文:', this.mapCtx)
    
    if (!this.mapCtx) {
      console.log('地图上下文不存在，尝试创建')
      this.mapCtx = wx.createMapContext('activityMap')
      if (!this.mapCtx) {
        console.log('创建地图上下文失败')
        return
      }
    }
    
    // 先获取最新的用户位置
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        console.log('获取到最新用户位置:', res)
        // 更新用户位置
        this.setData({
          userLocation: {
            latitude: res.latitude,
            longitude: res.longitude
          }
        }, () => {
          console.log('用户位置更新完成')
          // 更新用户位置标记
          this.addUserLocationMarker()
          
          // 先设置地图中心点为用户位置
          this.setData({
            latitude: res.latitude,
            longitude: res.longitude,
            scale: 16  // 设置一个合适的缩放级别
          }, () => {
            console.log('地图中心点设置完成')
            // 延迟一下，确保地图中心点已经更新
            setTimeout(() => {
              console.log('开始调用 moveToLocation')
              // 移动地图到用户位置
              this.mapCtx.moveToLocation({
                latitude: res.latitude,
                longitude: res.longitude,
                success: () => {
                  console.log('移动到用户位置成功')
                },
                fail: (err) => {
                  console.error('移动到用户位置失败', err)
                }
              })
            }, 100)
          })
        })
      },
      fail: (err) => {
        console.error('获取用户位置失败:', err)
        wx.showToast({
          title: '获取位置失败，请检查定位权限',
          icon: 'none'
        })
      }
    })
  },
  
  // 点击地图标记点
  onMarkerTap: function(e) {
    const markerId = Number(e.markerId)
    
    // 如果是用户位置标记(id为0)，不做处理
    if (markerId === 0) return
    
    const marker = this.data.mapMarkers.find(m => m.id === markerId)
    if (!marker) return
    
    // 找到对应的打卡记录
    const checkin = this.data.checkins.find(cp => Number(cp.id) === markerId)
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
          // 查看打卡图片
          wx.previewImage({
            urls: checkin.images
          })
        }
      }
    })
  },

  // 查看大图
  previewImage: function(e) {
    const current = e.currentTarget.dataset.src
    const urls = e.currentTarget.dataset.urls
    
    wx.previewImage({
      current,
      urls
    })
  },

  // 分享活动
  onShareAppMessage: function() {
    const activity = this.data.activity
    return {
      title: activity ? activity.title : '打卡活动',
      path: `/pages/activity/index?id=${this.data.id}`
    }
  },

  // 清除打卡点筛选
  clearCheckpointFilter: function() {
    this.setData({ 
      selectedCheckpointId: null,
      checkins: this.data.checkins,
      checkpointName: ''
    })
  }
}) 