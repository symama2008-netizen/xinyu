const DIRECTIONS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const TIME_OF_DAY = {
  morning: { name: '上午', sky: '#87CEEB' },
  noon: { name: '中午', sky: '#87CEEB' },
  afternoon: { name: '下午', sky: '#FFA726' },
  evening: { name: '傍晚', sky: '#FF7043' },
  night: { name: '夜晚', sky: '#1A237E' },
};

const LOCATIONS = {
  outdoor: { name: '心屿小镇', bg: 'grass' },
  oldhouse: { name: '老房子', bg: 'wood' },
  bakery: { name: '面包房', bg: 'brick' },
  bookstore: { name: '无名书店', bg: 'wood' },
  lighthouse: { name: '灯塔', bg: 'stone' },
  diner: { name: '深夜食堂', bg: 'brick' },
  repairshop: { name: '维修店', bg: 'metal' },
};

const ITEM_TYPES = {
  KEY: 'key',
  CONSUMABLE: 'consumable',
  QUEST: 'quest',
  COLLECTIBLE: 'collectible',
};

const EMOTION_EFFECTS = {
  anxious: { mood: '焦虑', icon: '😰', color: '#7B6B8B' },
  calm: { mood: '平静', icon: '😌', color: '#5A9AB4' },
  brave: { mood: '勇气', icon: '💪', color: '#FFA726' },
};