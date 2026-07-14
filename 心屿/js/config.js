const CONFIG = {
  // 渲染
  BLOCK_SIZE: 32,
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,

  // 世界
  WORLD_WIDTH: 50 * 32,
  WORLD_HEIGHT: 32 * 32,

  // 玩家
  PLAYER_SPEED: 80,
  PLAYER_SPEED_ANXIOUS: 88,

  // 摄像机
  CAMERA_SMOOTH: 0.12,

  // 粒子
  MAX_PARTICLES: 40,

  // 对话
  TYPING_SPEED: 28,

  // 交互距离（像素）
  INTERACT_DISTANCE: 2 * 32,

  // 室内房间占画布比例
  ROOM_WIDTH_RATIO: 0.65,
  ROOM_HEIGHT_RATIO: 0.70,

  // 室内角色缩放系数（放大 80%，避免角色像手办模型）
  INDOOR_CHAR_SCALE: 1.8,

  // 时间
  DAY_LENGTH: 300,

  // 颜色
  COLORS: {
    sky: { calm: '#87CEEB', anxious: '#9B8BB4', brave: '#FFD700' },
    grass: '#90EE90',
    road: '#C0C0C0',
    water: '#4169E1',
    wood: '#8B4513',
    woodLight: '#A0522D',
    brick: '#CD5C5C',
    stone: '#808080',
    glass: 'rgba(135, 206, 250, 0.6)',
    player: { skin: '#F9D4B4', hair: '#5C3A28', body: '#FCE4B8', legs: '#3D4F6B', feet: '#F5F5F5' },
    fangjie: { skin: '#FDE0C8', dress: '#F2A6B5', apron: 'rgba(255,255,255,0.7)', hair: '#8B5E3C', shoes: '#8B6B4A' },
    chenbo: { skin: '#F5DCC3', hair: '#A8A8A8', vest: '#7B5B3A', shirt: '#F5F5F5', book: '#8B4513', pants: '#5A5A5A' },
    laozhou: { skin: '#E8C896', coat: '#2C3E6B', hat: '#2C3E6B', beard: '#808080', pants: '#4A4A4A', boots: '#2C2C2C' },
    pangshu: { skin: '#FDDCC4', chef: '#FAFAFA', apron: '#5A5A5A', headscarf: '#2C4A6B', pants: '#3A3A3A', shoes: '#2C2C2C' },
    guanye: { skin: '#E8D5C0', hair: '#F0F0F0', overalls: '#8B5A3C', shirt: '#6B7B8D', pants: '#5C4033', shoes: '#2C2C2C' },
    waipo: { skin: '#FDE8D4', hair: '#E8E8E8', dress: '#D5C4E0', apron: '#FFF0F5', pants: '#5C4033', shoes: '#2C2C2C', cardigan: '#6B6B6B' },
    waigong: { skin: '#C49A6C', hair: '#C0C0C0', clothes: '#6B6B6B', pants: '#4A4A4A' }
  }
};
