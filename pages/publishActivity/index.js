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
    showDatePicker: false,
    datePickerType: '', // 'start' or 'end'
    categories: ['户外运动', '文化活动', '社交聚会', '教育培训', '其他']
  },

  onLoad: function (options) {
    // 初始化日期
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)
    
    this.setData({
      'formData.startTime': util.formatDate(today) + ' 08:00',
      'formData.endTime': util.formatDate(tomorrow) + ' 18:00'
    })
  },

  // 输入标题
  onInputTitle: function(e) {
    this.setData({ 'formData.title': e.detail.value })
  },

  // 选择分类
  onSelectCategory: function(e) {
    this.setData({ 'formData.category': e.detail.value })
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
    this.setData({ 
      showDatePicker: true,
      datePickerType: type
    })
  },

  // 日期选择器确认
  onDatePickerConfirm: function(e) {
    const value = e.detail.value
    
    if (this.data.datePickerType === 'start') {
      this.setData({ 
        'formData.startTime': value,
        showDatePicker: false
      })
    } else if (this.data.datePickerType === 'end') {
      this.setData({ 
        'formData.endTime': value,
        showDatePicker: false
      })
    }
  },

  // 日期选择器取消
  onDatePickerCancel: function() {
    this.setData({ showDatePicker: false })
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

  // 提交表单
  submitForm: function() {
    const { formData } = this.data
    
    // 验证所有必填字段
    if (!formData.title) {
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
            title: '创建成功',
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
          title: '创建失败',
          icon: 'none'
        })
      })
  }
}) 