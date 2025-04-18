// 模拟API请求
// 实际开发中请替换为真实的API请求

// 基础URL，实际部署时请替换为您的服务器地址
const BASE_URL = 'https://your-api-server.com/api';

// 模拟数据，实际开发时请删除
const mockData = {
  activities: [
    {
      id: 1,
      title: '徒步登山',
      description: '周末一起徒步爬山，感受大自然的美好',
      coverImage: '/images/activity1.jpg',
      creator: {
        id: 1,
        nickname: '户外探险家',
        avatar: '/images/avatar1.jpg'
      },
      startTime: '2023-04-20 09:00',
      endTime: '2023-04-20 18:00',
      location: '北京市海淀区颐和园',
      coordinates: {
        latitude: 39.9912,
        longitude: 116.2678
      },
      participants: [
        {id: 1, nickname: '户外探险家', avatar: '/images/avatar1.jpg'},
        {id: 2, nickname: '山野行者', avatar: '/images/avatar2.jpg'},
        {id: 3, nickname: '城市漫步者', avatar: '/images/avatar3.jpg'}
      ],
      checkpoints: [
        {
          id: 1,
          name: '颐和园东宫门',
          coordinates: {latitude: 39.9912, longitude: 116.2678}
        },
        {
          id: 2,
          name: '万寿山',
          coordinates: {latitude: 39.9902, longitude: 116.2643}
        },
        {
          id: 3,
          name: '昆明湖',
          coordinates: {latitude: 39.9889, longitude: 116.2619}
        }
      ]
    },
    {
      id: 2,
      title: '城市骑行',
      description: '城市道路骑行，感受城市脉搏',
      coverImage: '/images/activity2.jpg',
      creator: {
        id: 2,
        nickname: '单车达人',
        avatar: '/images/avatar2.jpg'
      },
      startTime: '2023-04-22 14:00',
      endTime: '2023-04-22 17:00',
      location: '北京市朝阳区奥林匹克公园',
      coordinates: {
        latitude: 40.0041,
        longitude: 116.3917
      },
      participants: [
        {id: 2, nickname: '单车达人', avatar: '/images/avatar2.jpg'},
        {id: 4, nickname: '风行者', avatar: '/images/avatar4.jpg'},
      ],
      checkpoints: [
        {
          id: 1,
          name: '南门',
          coordinates: {latitude: 40.0041, longitude: 116.3917}
        },
        {
          id: 2,
          name: '森林公园',
          coordinates: {latitude: 40.0082, longitude: 116.3944}
        }
      ]
    }
  ],
  checkins: [
    {
      id: 1,
      activityId: 1,
      userId: 2,
      checkpointId: 1,
      text: '到达颐和园东宫门，天气非常好！',
      images: ['/images/checkin1.jpg'],
      coordinates: {
        latitude: 39.9912,
        longitude: 116.2678
      },
      createdAt: '2023-04-20 09:15'
    },
    {
      id: 2,
      activityId: 1,
      userId: 1,
      checkpointId: 2,
      text: '登上万寿山，视野开阔，看到了整个昆明湖的美景',
      images: ['/images/checkin2.jpg', '/images/checkin3.jpg'],
      coordinates: {
        latitude: 39.9902,
        longitude: 116.2643
      },
      createdAt: '2023-04-20 10:30'
    }
  ]
};

// 请求封装
const request = (url, method = 'GET', data = {}) => {
  return new Promise((resolve, reject) => {
    // 模拟API请求，实际开发时删除这部分代码
    setTimeout(() => {
      if (url.includes('getActivities')) {
        resolve({data: mockData.activities});
      } else if (url.includes('getActivityDetail')) {
        const activity = mockData.activities.find(a => a.id === data.id);
        resolve({data: activity});
      } else if (url.includes('getCheckins')) {
        const checkins = mockData.checkins.filter(c => c.activityId === data.activityId);
        resolve({data: checkins});
      } else {
        resolve({data: {success: true, message: '操作成功'}});
      }
    }, 500);

    // 实际API请求代码，开发时请取消注释
    /*
    wx.request({
      url: BASE_URL + url,
      method,
      data,
      header: {
        'content-type': 'application/json',
        'Authorization': wx.getStorageSync('token') || ''
      },
      success(res) {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(res);
        }
      },
      fail(err) {
        reject(err);
      }
    });
    */
  });
};

// API方法
const api = {
  // 活动相关API
  getActivities: (params) => {
    return request('/getActivities', 'GET', params);
  },
  
  getActivityDetail: (id) => {
    return request('/getActivityDetail', 'GET', {id});
  },
  
  createActivity: (data) => {
    return request('/createActivity', 'POST', data);
  },
  
  joinActivity: (activityId) => {
    return request('/joinActivity', 'POST', {activityId});
  },
  
  quitActivity: (activityId) => {
    return request('/quitActivity', 'POST', {activityId});
  },
  
  // 打卡相关API
  createCheckin: (data) => {
    return request('/createCheckin', 'POST', data);
  },
  
  getCheckins: (activityId) => {
    return request('/getCheckins', 'GET', {activityId});
  },

  // 用户相关API
  getUserInfo: () => {
    return request('/getUserInfo', 'GET');
  },
  
  getUserActivities: () => {
    return request('/getUserActivities', 'GET');
  }
};

module.exports = api; 