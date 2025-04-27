const formatNumber = (n) => {
  n = n.toString();
  return n[1] ? n : `0${n}`;
};

const formatTime = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`;
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${formatNumber(month)}-${formatNumber(day)}`;
};

// 格式化日期时间为 YYYY-MM-DD HH:MM (显示用户友好格式)
const formatDateTimeForDisplay = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  return `${year}-${formatNumber(month)}-${formatNumber(day)} ${formatNumber(hour)}:${formatNumber(minute)}`;
};

// 格式化日期时间为 YYYY-MM-DD HH:MM:SS (接口存储格式)
const formatDateTimeForAPI = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  return `${year}-${formatNumber(month)}-${formatNumber(day)} ${formatNumber(hour)}:${formatNumber(minute)}:${formatNumber(second)}`;
};

const formatTimeFromNow = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now - date;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;
  
  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  } else if (diff < month) {
    return `${Math.floor(diff / day)}天前`;
  } else if (diff < year) {
    return `${Math.floor(diff / month)}个月前`;
  } else {
    return `${Math.floor(diff / year)}年前`;
  }
};

// 复制到本地临时路径，方便预览
const getLocalUrl = (path, name) => {
  const fs = wx.getFileSystemManager();
  const tempFileName = `${wx.env.USER_DATA_PATH}/${name}`;
  fs.copyFileSync(path, tempFileName);
  return tempFileName;
};

// 计算两个地理坐标点之间的距离（单位：米）
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // 地球半径，单位米
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // 返回距离，单位米
};

// 角度转弧度
const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

// 格式化距离显示
const formatDistance = (distance) => {
  if (distance < 1000) {
    return Math.round(distance) + '米';
  } else {
    return (distance / 1000).toFixed(1) + '公里';
  }
};

module.exports = {
  formatTime,
  formatDate,
  formatDateTimeForDisplay,
  formatDateTimeForAPI,
  getLocalUrl,
  formatTimeFromNow,
  calculateDistance,
  formatDistance,
};
