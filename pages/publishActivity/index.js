// 引入API和工具
const api = require('../../utils/api.js')
const util = require('../../utils/util.js')

Page({
  data: {
    formData: {
      title: '',
      coverImage: '',
      category: '',
      startTime: '',
      endTime: '',
      location: '',
      coordinates: null,
      description: ''
    },
    submitting: false,
    loading: false,
    showDatePicker: false,
    datePickerType: '', // 'start' or 'end'
    datePickerDays: [],
    datePickerHours: [],
    datePickerMinutes: [],
    datePickerValue: [0, 0, 0],
    tempDatePickerValue: '',
    categories: ['户外运动', '文化活动', '社交聚会', '教育培训', '其他']
  },

  onLoad: function (options) {
    // 显示加载状态
    this.setData({
      loading: true
    })
    
    // 初始化日期
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)
    
    // 生成日期选择器数据
    this.initDatePickerData()
    
    this.setData({
      'formData.startTime': util.formatDate(today) + ' 08:00',
      'formData.endTime': util.formatDate(tomorrow) + ' 18:00',
      loading: false
    })
  },
  
  // 初始化日期选择器数据
  initDatePickerData: function() {
    const days = []
    const hours = []
    const minutes = []
    
    // 生成未来30天的日期
    const now = new Date()
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(now.getDate() + i)
      days.push(util.formatDate(date))
    }
    
    // 生成小时
    for (let i = 0; i < 24; i++) {
      hours.push(i < 10 ? '0' + i : '' + i)
    }
    
    // 生成分钟
    for (let i = 0; i < 60; i += 15) {
      minutes.push(i < 10 ? '0' + i : '' + i)
    }
    
    this.setData({
      datePickerDays: days,
      datePickerHours: hours,
      datePickerMinutes: minutes
    })
  },

  // 输入标题
  onInputTitle: function(e) {
    this.setData({ 'formData.title': e.detail.value })
  },

  // 选择分类
  onSelectCategory: function(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      'formData.category': this.data.categories[index]
    })
  },

  // 选择封面图片
  chooseCoverImage: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ 'formData.coverImage': res.tempFilePaths[0] })
      }
    })
  },

  // 显示日期选择器
  showDatePicker: function(e) {
    const type = e.currentTarget.dataset.type
    const currentValue = type === 'start' ? this.data.formData.startTime : this.data.formData.endTime
    
    // 解析当前日期时间
    let currentDate
    try {
      const [datePart, timePart] = currentValue.split(' ')
      const [year, month, day] = datePart.split('-').map(Number)
      const [hour, minute] = timePart.split(':').map(Number)
      currentDate = new Date(year, month - 1, day, hour, minute)
    } catch (e) {
      currentDate = new Date()
    }
    
    // 查找当前日期在数组中的索引
    const formattedDate = util.formatDate(currentDate)
    const hourStr = currentDate.getHours() < 10 ? '0' + currentDate.getHours() : '' + currentDate.getHours()
    const minuteStr = currentDate.getMinutes() < 10 ? '0' + currentDate.getMinutes() : '' + currentDate.getMinutes()
    
    const dayIndex = this.data.datePickerDays.indexOf(formattedDate)
    const hourIndex = this.data.datePickerHours.indexOf(hourStr)
    const minuteIndex = this.data.datePickerMinutes.indexOf(minuteStr) !== -1 
                      ? this.data.datePickerMinutes.indexOf(minuteStr) 
                      : Math.floor(currentDate.getMinutes() / 15)
    
    this.setData({ 
      showDatePicker: true,
      datePickerType: type,
      datePickerValue: [dayIndex !== -1 ? dayIndex : 0, hourIndex !== -1 ? hourIndex : 8, minuteIndex !== -1 ? minuteIndex : 0]
    })
  },
  
  // 日期选择器变更
  onDatePickerChange: function(e) {
    const values = e.detail.value
    const [dayIndex, hourIndex, minuteIndex] = values
    
    const selectedDay = this.data.datePickerDays[dayIndex]
    const selectedHour = this.data.datePickerHours[hourIndex]
    const selectedMinute = this.data.datePickerMinutes[minuteIndex]
    
    const formattedDateTime = `${selectedDay} ${selectedHour}:${selectedMinute}`
    
    this.setData({
      tempDatePickerValue: formattedDateTime,
      datePickerValue: values
    })
  },

  // 日期选择器确认
  onDatePickerConfirm: function() {
    const { datePickerType, tempDatePickerValue, datePickerValue } = this.data
    let valueToUse = tempDatePickerValue
    
    // 如果没有临时值（用户没有滑动选择器），根据当前选中值构建时间
    if (!valueToUse) {
      const [dayIndex, hourIndex, minuteIndex] = datePickerValue
      const selectedDay = this.data.datePickerDays[dayIndex]
      const selectedHour = this.data.datePickerHours[hourIndex]
      const selectedMinute = this.data.datePickerMinutes[minuteIndex]
      valueToUse = `${selectedDay} ${selectedHour}:${selectedMinute}`
    }
    
    if (datePickerType === 'start') {
      this.setData({ 
        'formData.startTime': valueToUse,
        showDatePicker: false,
        tempDatePickerValue: ''
      })
    } else if (datePickerType === 'end') {
      this.setData({ 
        'formData.endTime': valueToUse,
        showDatePicker: false,
        tempDatePickerValue: ''
      })
    }
  },

  // 日期选择器取消
  onDatePickerCancel: function() {
    this.setData({ 
      showDatePicker: false,
      tempDatePickerValue: ''
    })
  },

  // 选择活动地点
  chooseLocation: function() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          'formData.location': res.name || res.address,
          'formData.coordinates': {
            latitude: res.latitude,
            longitude: res.longitude
          }
        })
      }
    })
  },

  // 输入描述
  onInputDescription: function(e) {
    this.setData({ 'formData.description': e.detail.value })
  },

  // 重置表单
  resetForm: function() {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消发布活动吗？已填写的内容将不会保存。',
      cancelText: '继续编辑',
      confirmText: '确认取消',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack()
        }
      }
    })
  },

  // 提交表单
  submitForm: function() {
    const { formData } = this.data
    
    // 验证所有必填字段
    if (!formData.title || formData.title.trim() === '') {
      wx.showToast({
        title: '请输入活动标题',
        icon: 'none'
      })
      return
    }
    
    if (!formData.coverImage) {
      wx.showToast({
        title: '请选择封面图片',
        icon: 'none'
      })
      return
    }

    if (!formData.category) {
      wx.showToast({
        title: '请选择活动分类',
        icon: 'none'
      })
      return
    }
    
    if (!formData.location || !formData.coordinates) {
      wx.showToast({
        title: '请选择活动地点',
        icon: 'none'
      })
      return
    }
    
    // 验证开始时间和结束时间
    try {
      const startDateTime = new Date(formData.startTime.replace(' ', 'T'))
      const endDateTime = new Date(formData.endTime.replace(' ', 'T'))
      
      if (endDateTime <= startDateTime) {
        wx.showToast({
          title: '结束时间必须晚于开始时间',
          icon: 'none'
        })
        return
      }
    } catch (e) {
      wx.showToast({
        title: '日期格式不正确',
        icon: 'none'
      })
      return
    }
    
    // 开始提交
    this.setData({ submitting: true })
    
    // 模拟上传图片
    const uploadCoverImage = () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve('/images/activity' + (Math.floor(Math.random() * 3) + 1) + '.jpg')
        }, 1000)
      })
    }
    
    // 先上传图片，再提交活动
    uploadCoverImage()
      .then((coverImageUrl) => {
        const data = {
          ...formData,
          coverImage: coverImageUrl,
          createdAt: new Date().toISOString()
        }
        
        return api.createActivity(data)
      })
      .then(res => {
        this.setData({ submitting: false })
        
        if (res && res.data && res.data.success) {
          wx.showToast({
            title: '发布成功',
            icon: 'success',
            duration: 1500,
            success: () => {
              setTimeout(() => {
                wx.switchTab({
                  url: '/pages/index/index'
                })
              }, 1500)
            }
          })
        }
      })
      .catch(err => {
        console.error('创建活动失败', err)
        this.setData({ submitting: false })
        
        wx.showToast({
          title: '发布失败',
          icon: 'none'
        })
      })
  }
})