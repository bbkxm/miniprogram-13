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
      longitude: null,
      latitude: null,
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
    categories: ['旅游', '公益', '其他']
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
    
    // 用户显示用 HH:MM格式，数据还是保存为 HH:MM:SS 
    this.setData({
      'formData.startTime': util.formatDateTimeForDisplay(today).replace(/:\d{2}$/, '') + ':00',
      'formData.endTime': util.formatDateTimeForDisplay(tomorrow).replace(/:\d{2}$/, '') + ':00',
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
          'formData.latitude': res.latitude,
          'formData.longitude': res.longitude
        })
      }
    })
  },

  // 输入描述
  onInputDescription: function(e) {
    this.setData({ 'formData.description': e.detail.value })
  },

  // TDesign 日期时间选择器相关函数
  // 显示开始时间选择器
  showStartTimePicker() {
    // 解析当前的开始时间，转换为时间戳
    const currentTime = this.parseTimeStringToTimestamp(this.data.formData.startTime);
    this.setData({
      startTimeVisible: true,
      startTimeValue: currentTime
    });
  },

  // 显示结束时间选择器
  showEndTimePicker() {
    // 解析当前的结束时间，转换为时间戳
    const currentTime = this.parseTimeStringToTimestamp(this.data.formData.endTime);
    this.setData({
      endTimeVisible: true,
      endTimeValue: currentTime
    });
  },

  // 开始时间选择器可见性变化
  onStartTimeVisibleChange(e) {
    const { visible } = e.detail;
    this.setData({
      startTimeVisible: visible,
    });
  },

  // 结束时间选择器可见性变化
  onEndTimeVisibleChange(e) {
    const { visible } = e.detail;
    this.setData({
      endTimeVisible: visible,
    });
  },

  // 开始时间变化
  onStartTimeChange(e) {
    const { value } = e.detail;
    this.setData({
      startTimeValue: value,
    });
  },

  // 结束时间变化
  onEndTimeChange(e) {
    const { value } = e.detail;
    this.setData({
      endTimeValue: value,
    });
  },

  // 开始时间确认
  onStartTimeConfirm(e) {
    const { value } = e.detail;
    // 将时间戳转换为字符串格式
    const formattedTime = this.formatTimestampToString(value);
    this.setData({
      'formData.startTime': formattedTime,
      startTimeVisible: false,
    });
  },

  // 结束时间确认
  onEndTimeConfirm(e) {
    const { value } = e.detail;
    // 将时间戳转换为字符串格式
    const formattedTime = this.formatTimestampToString(value);
    this.setData({
      'formData.endTime': formattedTime,
      endTimeVisible: false,
    });
  },

  // 开始时间取消
  onStartTimeCancel() {
    this.setData({
      startTimeVisible: false,
    });
  },

  // 结束时间取消
  onEndTimeCancel() {
    this.setData({
      endTimeVisible: false,
    });
  },

  // 辅助函数：将时间字符串解析为时间戳
  parseTimeStringToTimestamp(timeString) {
    try {
      const [datePart, timePart] = timeString.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      const date = new Date(year, month - 1, day, hour, minute);
      return date.getTime();
    } catch (e) {
      // 如果解析失败，返回当前时间
      return new Date().getTime();
    }
  },

  // 辅助函数：将时间戳格式化为字符串
  formatTimestampToString(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
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
    
    if (!formData.location || !formData.longitude || !formData.latitude) {
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
        // 创建当前时间并使用API格式化 YYYY-MM-DD HH:MM:SS
        const now = new Date();
        const formattedCreatedAt = util.formatDateTimeForAPI(now);
        
        // 确保 startTime 和 endTime 也包含秒数部分
        const formDataWithSeconds = {
          ...formData,
          // 检查是否已有秒数部分（检查时间格式是否有两个冒号）
          startTime: formData.startTime.split(':').length > 2 ? formData.startTime : formData.startTime + ':00',
          endTime: formData.endTime.split(':').length > 2 ? formData.endTime : formData.endTime + ':00'
        };
        
        const data = {
          ...formDataWithSeconds,
          coverImage: coverImageUrl
        }
        
        return api.createActivity(data)
      })
      .then(res => {
        this.setData({ submitting: false })
        
        if (res && res.data) {
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