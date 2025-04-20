// 引入API和工具
const api = require('../../utils/api.js')
const util = require('../../utils/util.js')

Page({
  data: {
    id: null,
    activity: null,
    checkins: [],
    filteredCheckins: [],
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
      this.setData({ id: parseInt(options.id) })
      
      // 记录选中的打卡点ID（如果有）
      if (options.checkpointId) {
        this.setData({ selectedCheckpointId: parseInt(options.checkpointId) })
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
          const currentUserId = 2
          const activity = res.data

          this.setData({ 
            activity: activity,
            loading: false,
            isCreator: activity.creator.id === currentUserId,
            hasJoined: activity.participants.some(p => p.id === currentUserId)
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
    api.getCheckins(this.data.id)
      .then(res => {
        if (res && res.data) {
          const checkins = res.data.map(checkin => {
            checkin.formattedTime = util.formatTimeFromNow(checkin.createdAt)
            return checkin
          })
          this.setData({ checkins })
          
          // 如果有选中的打卡点ID，则过滤打卡记录
          this.filterCheckinsByCheckpoint()
        }
      })
      .catch(err => {
        console.error('获取打卡记录失败', err)
      })
  },

  // 过滤特定打卡点的打卡记录
  filterCheckinsByCheckpoint: function() {
    const { checkins, selectedCheckpointId, activity } = this.data
    
    if (selectedCheckpointId && checkins.length > 0) {
      // 过滤属于选中打卡点的记录
      const filtered = checkins.filter(checkin => checkin.checkpointId === selectedCheckpointId)
      
      // 找到选中的打卡点名称
      let checkpointName = '未知打卡点'
      if (activity && activity.checkpoints) {
        const checkpoint = activity.checkpoints.find(cp => cp.id === selectedCheckpointId)
        if (checkpoint) {
          checkpointName = checkpoint.name
        }
      }
      
      this.setData({ 
        filteredCheckins: filtered,
        checkpointName: checkpointName
      })
    } else {
      // 如果没有选中的打卡点，则显示所有记录
      this.setData({ 
        filteredCheckins: checkins,
        checkpointName: ''
      })
    }
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
      }
    })
  },

  // 切换Tab
  switchTab: function(e) {
    const tabId = e.currentTarget.dataset.id
    if (tabId !== this.data.currentTab) {
      this.setData({ currentTab: tabId })
      
      // 如果切换到地图tab，初始化地图数据
      if (tabId === 'map') {
        // 延迟一下，确保地图组件已准备好
        setTimeout(() => {
          this.viewMap()
        }, 100)
      }
    }
  },

  // 加入活动
  joinActivity: function() {
    wx.showLoading({ title: '加入中...' })
    
    api.joinActivity(this.data.id)
      .then(res => {
        wx.hideLoading()
        if (res && res.data && res.data.success) {
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
              if (res && res.data && res.data.success) {
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
    const activity = this.data.activity
    if (activity && activity.checkpoints) {
      console.log('切换到地图视图')
      
      // 构建地图标记点
      const mapMarkers = activity.checkpoints.map((checkpoint, index) => {
        return {
          id: checkpoint.id,
          activityId: activity.id,
          latitude: checkpoint.coordinates.latitude,
          longitude: checkpoint.coordinates.longitude,
          title: checkpoint.name,
          iconPath: '/images/marker.png',
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
      
      // 构建路线
      const mapPolyline = []
      if (activity.checkpoints.length >= 2) {
        const points = activity.checkpoints.map(checkpoint => {
          return {
            latitude: checkpoint.coordinates.latitude,
            longitude: checkpoint.coordinates.longitude
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
      
      // 更新地图数据并切换到地图标签
      this.setData({
        mapMarkers,
        mapPolyline,
        currentTab: 'map'
      })
      
      // 如果有用户位置，添加用户位置标记
      if (this.data.userLocation) {
        this.addUserLocationMarker()
      }
      
      // 延迟一下，确保地图已准备好
      setTimeout(() => {
        this.includeAllMarkers()
      }, 500)
    } else {
      wx.showToast({
        title: '没有打卡点信息',
        icon: 'none'
      })
    }
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
    const { mapMarkers } = this.data
    if (!this.mapCtx || mapMarkers.length === 0) return
    
    this.mapCtx.includePoints({
      points: mapMarkers.map(marker => {
        return {
          latitude: marker.latitude,
          longitude: marker.longitude
        }
      }),
      padding: [80, 80, 80, 80]
    })
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
    if (!this.data.userLocation || !this.mapCtx) return
    
    this.mapCtx.moveToLocation()
  },
  
  // 点击地图标记点
  onMarkerTap: function(e) {
    const markerId = e.markerId
    
    // 如果是用户位置标记(id为0)，不做处理
    if (markerId === 0) return
    
    const marker = this.data.mapMarkers.find(m => m.id === markerId)
    if (!marker) return
    
    // 找到对应的打卡点
    const checkpoint = this.data.activity.checkpoints.find(cp => cp.id === markerId)
    if (!checkpoint) return
    
    // 查找与该打卡点相关的打卡记录
    api.getCheckins(this.data.id)
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
                  // 切换到打卡记录标签并筛选
                  this.setData({
                    selectedCheckpointId: checkpoint.id,
                    currentTab: 'checkins'
                  })
                  // 过滤打卡记录
                  this.filterCheckinsByCheckpoint()
                } else {
                  // 跳转到打卡页面
                  wx.navigateTo({
                    url: `/pages/checkin/index?activityId=${this.data.id}`
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
      filteredCheckins: this.data.checkins,
      checkpointName: ''
    })
  }
}) 