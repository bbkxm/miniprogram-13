// 引入API和工具
const api = require('../../utils/api.js')
const util = require('../../utils/util.js')

Page({
  data: {
    activityId: null,      // 当前活动ID（如果是单个活动的地图）
    activity: null,        // 当前活动数据
    activities: [],        // 所有活动数据（如果是查看所有打卡点）
    markers: [],           // 地图标记点
    polyline: [],          // 路线数据
    userLocation: null,    // 用户位置
    scale: 14,             // 地图缩放级别
    loading: true,         // 加载状态
    showAllActivities: false // 是否显示所有活动的打卡点
  },

  onLoad: function (options) {
    console.log('地图页面参数:', options)
    
    // 加载用户位置
    this.getUserLocation()
    
    // 判断是查看单个活动还是所有活动的打卡点
    if (options.showAll === 'true') {
      // 查看所有活动的打卡点
      console.log('显示所有活动打卡点')
      this.setData({ showAllActivities: true })
      this.loadAllActivities()
    } else if (options.activityId) {
      // 查看单个活动的打卡点
      const activityId = parseInt(options.activityId)
      console.log('显示单个活动打卡点, ID:', activityId)
      this.setData({ activityId: activityId })
      
      // 如果传入了markers，则直接使用
      if (options.markers) {
        try {
          console.log('使用传入的标记数据')
          const markers = JSON.parse(decodeURIComponent(options.markers))
          
          // 添加必要的标记属性
          const enhancedMarkers = markers.map((marker, index) => {
            return {
              ...marker,
              iconPath: '/images/marker.png',
              width: 30,
              height: 30,
              callout: {
                content: marker.title,
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
          
          this.setData({ 
            markers: enhancedMarkers, 
            loading: false,
            latitude: enhancedMarkers[0].latitude,
            longitude: enhancedMarkers[0].longitude
          })
          
          // 添加用户位置标记
          if (this.data.userLocation) {
            this.addUserLocationMarker()
          }
        } catch (err) {
          console.error('解析markers失败', err)
          // 解析失败时尝试加载活动详情
          this.loadActivityDetail()
        }
      } else {
        // 否则加载活动详情
        console.log('加载活动详情')
        this.loadActivityDetail()
      }
    } else {
      // 没有指定参数时（如从tabBar进入），默认显示所有活动的打卡点
      console.log('无参数，默认显示所有活动')
      this.setData({ showAllActivities: true })
      this.loadAllActivities()
    }
  },
  
  onShow: function() {
    console.log('地图页面显示')
    
    // 从缓存检查是否有需要显示的单个活动
    wx.getStorage({
      key: 'current_view_activity',
      success: (res) => {
        // 获取缓存的活动信息
        const activityInfo = res.data
        console.log('从缓存获取活动信息:', activityInfo)
        
        // 如果是从活动详情页跳转来显示单个活动
        if (activityInfo && activityInfo.activityId && !activityInfo.showAll) {
          // 设置为单个活动模式
          this.setData({ 
            showAllActivities: false,
            activityId: activityInfo.activityId
          })
          
          // 加载单个活动数据
          this.loadActivityDetail()
          
          // 清除缓存，避免下次自动加载
          wx.removeStorage({
            key: 'current_view_activity'
          })
          
          // 不执行下面的刷新所有活动代码
          return
        }
      },
      complete: () => {
        // 无论是否有缓存活动，如果当前是显示所有活动模式且不是加载状态，就刷新所有活动
        if (this.data.showAllActivities && !this.data.loading) {
          this.loadAllActivities()
        }
      }
    })
  },
  
  // 下拉刷新
  onPullDownRefresh: function() {
    if (this.data.showAllActivities) {
      this.loadAllActivities()
    } else if (this.data.activityId) {
      this.loadActivityDetail()
    }
    wx.stopPullDownRefresh()
  },

  // 加载所有活动数据
  loadAllActivities: function() {
    this.setData({ loading: true })
    
    api.getActivities()
      .then(res => {
        if (res && res.data && Array.isArray(res.data)) {
          // 设置活动数据
          this.setData({ 
            activities: res.data,
            loading: false 
          })
          
          // 初始化所有活动的地图标记点
          this.initAllActivitiesMarkers()
        } else {
          this.setData({ loading: false })
          wx.showToast({
            title: '无活动数据',
            icon: 'none'
          })
        }
      })
      .catch(err => {
        console.error('获取活动数据失败', err)
        this.setData({ loading: false })
        wx.showToast({
          title: '获取活动数据失败',
          icon: 'none'
        })
      })
  },

  // 加载单个活动详情
  loadActivityDetail: function() {
    this.setData({ loading: true })

    api.getActivityDetail(this.data.activityId)
      .then(res => {
        if (res && res.data) {
          const activity = res.data
          
          // 构建地图标记点
          const markers = this.buildMarkers(activity)
          
          // 构建路线（如果有多个标记点）
          const polyline = this.buildPolyline(activity)
          
          this.setData({ 
            activity,
            markers,
            polyline,
            loading: false
          })
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

  // 初始化所有活动的地图标记点
  initAllActivitiesMarkers: function() {
    const { activities } = this.data
    const markers = []
    
    // 用于追踪已添加的坐标点，避免重复
    const addedCoordinates = new Set()
    
    // 为每个活动的每个打卡点创建标记
    activities.forEach((activity, activityIndex) => {
      if (activity.checkpoints && Array.isArray(activity.checkpoints)) {
        activity.checkpoints.forEach((checkpoint, checkpointIndex) => {
          const coordinates = checkpoint.coordinates
          const coordKey = `${coordinates.latitude},${coordinates.longitude}`
          
          // 检查该坐标是否已添加（避免重复标记）
          if (!addedCoordinates.has(coordKey)) {
            addedCoordinates.add(coordKey)
            
            markers.push({
              id: checkpoint.id,
              activityId: activity.id,
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              title: checkpoint.name,
              iconPath: '/images/marker.png', // 标记点图标，需要添加
              width: 30,
              height: 30,
              callout: {
                content: `${activity.title}: ${checkpoint.name}`,
                color: '#000000',
                fontSize: 14,
                borderRadius: 4,
                padding: 5,
                display: 'ALWAYS'
              }
            })
          }
        })
      }
    })
    
    // 如果有标记点，设置地图中心为第一个标记点
    if (markers.length > 0) {
      this.setData({
        markers,
        latitude: markers[0].latitude,
        longitude: markers[0].longitude
      })
    } else {
      this.setData({ markers })
    }
    
    // 增加用户位置标记
    this.addUserLocationMarker()
  },

  // 构建单个活动的地图标记点
  buildMarkers: function(activity) {
    if (!activity || !activity.checkpoints) return []
    
    const markers = activity.checkpoints.map((checkpoint, index) => {
      return {
        id: checkpoint.id,
        activityId: activity.id,
        latitude: checkpoint.coordinates.latitude,
        longitude: checkpoint.coordinates.longitude,
        title: checkpoint.name,
        iconPath: '/images/marker.png', // 标记点图标，需要添加
        width: 30,
        height: 30,
        callout: {
          content: checkpoint.name,
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
    
    return markers
  },

  // 构建路线
  buildPolyline: function(activity) {
    if (!activity || !activity.checkpoints || activity.checkpoints.length < 2) return []
    
    const points = activity.checkpoints.map(checkpoint => {
      return {
        latitude: checkpoint.coordinates.latitude,
        longitude: checkpoint.coordinates.longitude
      }
    })
    
    return [{
      points,
      color: '#4285f4',
      width: 4,
      dottedLine: false,
      arrowLine: true
    }]
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
        wx.showToast({
          title: '获取位置失败，请授权位置权限',
          icon: 'none'
        })
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
      iconPath: '/images/user_location.png', // 用户位置图标，需要添加
      width: 30,
      height: 30,
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
    if (!this.data.userLocation) return
    
    this.mapCtx.moveToLocation()
  },

  // 视野包含所有标记点
  includeAllMarkers: function() {
    const { markers } = this.data
    if (markers.length === 0) return
    
    this.mapCtx.includePoints({
      points: markers.map(marker => {
        return {
          latitude: marker.latitude,
          longitude: marker.longitude
        }
      }),
      padding: [80, 80, 80, 80]
    })
  },

  // 点击标记点
  markerTap: function(e) {
    const markerId = e.markerId
    const marker = this.data.markers.find(m => m.id === markerId)
    
    // 如果是用户位置标记(id为0)，不做处理
    if (markerId === 0) {
      return
    }
    
    if (marker) {
      // 单个活动的打卡点处理
      if (!this.data.showAllActivities && this.data.activity) {
        this.handleSingleActivityMarkerTap(marker)
      } 
      // 所有活动的打卡点处理
      else if (this.data.showAllActivities) {
        this.handleAllActivitiesMarkerTap(marker)
      }
    }
  },
  
  // 处理单个活动的打卡点点击
  handleSingleActivityMarkerTap: function(marker) {
    // 找到对应的打卡点
    const checkpoint = this.data.activity.checkpoints.find(cp => cp.id === marker.id)
    
    if (checkpoint) {
      // 查找与该打卡点相关的打卡记录
      api.getCheckins(this.data.activityId)
        .then(res => {
          if (res && res.data) {
            // 筛选出属于该打卡点的打卡记录
            const checkpointCheckins = res.data.filter(checkin => checkin.checkpointId === checkpoint.id)
            
            let content = `打卡点: ${checkpoint.name}\n`
            
            if (checkpointCheckins.length > 0) {
              content += `已有 ${checkpointCheckins.length} 条打卡记录`
            } else {
              content += '暂无打卡记录'
            }
            
            wx.showModal({
              title: '打卡点详情',
              content: content,
              confirmText: checkpointCheckins.length > 0 ? '查看打卡' : '去打卡',
              cancelText: '关闭',
              success: (res) => {
                if (res.confirm) {
                  if (checkpointCheckins.length > 0) {
                    // 从tabBar地图页面导航到活动详情并显示打卡记录
                    wx.navigateTo({
                      url: `/pages/activity/index?id=${this.data.activityId}&tab=checkins&checkpointId=${checkpoint.id}`
                    })
                  } else {
                    // 跳转到打卡页面
                    wx.navigateTo({
                      url: `/pages/checkin/checkin?activityId=${this.data.activityId}`
                    })
                  }
                }
              }
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
    } else {
      wx.showToast({
        title: marker.title,
        icon: 'none'
      })
    }
  },
  
  // 处理所有活动的打卡点点击
  handleAllActivitiesMarkerTap: function(marker) {
    // 查找对应的活动和打卡点
    let activityInfo = null
    let checkpointInfo = null
    
    for (const activity of this.data.activities) {
      if (activity.id === marker.activityId && activity.checkpoints) {
        activityInfo = activity
        checkpointInfo = activity.checkpoints.find(cp => cp.id === marker.id)
        if (checkpointInfo) break
      }
    }
    
    if (activityInfo && checkpointInfo) {
      // 查询与该打卡点相关的打卡记录
      api.getCheckins(activityInfo.id)
        .then(res => {
          if (res && res.data) {
            // 筛选出属于该打卡点的打卡记录
            const checkpointCheckins = res.data.filter(checkin => checkin.checkpointId === checkpointInfo.id)
            
            let content = `活动: ${activityInfo.title}\n`
                        + `打卡点: ${checkpointInfo.name}\n`
                        + `位置: ${activityInfo.location}\n`
            
            if (checkpointCheckins.length > 0) {
              content += `已有 ${checkpointCheckins.length} 条打卡记录`
            } else {
              content += '暂无打卡记录'
            }
            
            wx.showModal({
              title: '打卡点详情',
              content: content,
              confirmText: '查看活动',
              cancelText: '关闭',
              success: (res) => {
                if (res.confirm) {
                  // 跳转到活动详情页，并带上打卡点信息
                  wx.navigateTo({
                    url: `/pages/activity/index?id=${activityInfo.id}&tab=checkins&checkpointId=${checkpointInfo.id}`
                  })
                }
              }
            })
          }
        })
        .catch(err => {
          console.error('获取打卡记录失败', err)
          // 即使获取打卡记录失败，也显示基本信息
          const content = `活动: ${activityInfo.title}\n`
                        + `打卡点: ${checkpointInfo.name}\n`
                        + `位置: ${activityInfo.location}`
          
          wx.showModal({
            title: '打卡点详情',
            content: content,
            confirmText: '查看活动',
            cancelText: '关闭',
            success: (res) => {
              if (res.confirm) {
                wx.navigateTo({
                  url: `/pages/activityDetail/activityDetail?id=${activityInfo.id}`
                })
              }
            }
          })
        })
    } else {
      wx.showToast({
        title: marker.title,
        icon: 'none'
      })
    }
  },

  // 地图加载完成
  mapLoaded: function() {
    this.mapCtx = wx.createMapContext('map')
    
    // 延迟一下，确保地图已准备好
    setTimeout(() => {
      this.includeAllMarkers()
    }, 500)
  }
}) 