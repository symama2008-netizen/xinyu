const GameState = {
  day: 1,
  timeOfDay: 'morning',
  timeElapsed: 0,
  location: 'outdoor',

  player: {
    x: 14.5 * CONFIG.BLOCK_SIZE + 16,
    y: 16 * CONFIG.BLOCK_SIZE + 16,
    dir: 'down',
    animFrame: 0,
    isMoving: false
  },

  emotions: {
    anxious: 30,
    calm: 30,
    brave: 30
  },

  inventory: [],
  discoveries: [],
  npcFlags: {},
  npcLevels: {},
  visitedScenes: ['outdoor'],
  collectedLetters: [],
  keyItems: [],

  flags: {
    gameStarted: false,
    hasDiary: false,
    day1Completed: false,
    day2Completed: false,
    day3Completed: false,
    isTired: false,
    inOpeningCutscene: false,
    openingComplete: false,
    helpedLaozhou: false,
    ending: null,
    bgmEnabled: true,
    // Day1 剧情标志
    day1Arrived: false,
    day1TownVisited: false,
    day1EveningTalked: false,
    day1WaigongTalked: false,
    metFangjie: false,
    metChenbo: false,
    // Day2 剧情标志
    day2Started: false,
    day2AlbumTalked: false,
    day2WaigongTalked: false,
    metGuanye: false,
    metPangshu: false,
    // Day3 剧情标志
    day3Started: false,
    hasLighthouseKey: false,
    lighthouseClimbed: false,
    day3LighthouseTalked: false,
    day3WaigongTalked: false,
    // 结局标志
    endingReturn: false,
    endingStay: false,
    endingStayEvening: false,
    endingDiaryWriting: false,
    // 对话历史（节点/选项是否已完成，避免重复奖励）
    dialogueHistory: {}
  },

  dialogueActive: false,
  currentDialogue: null,
  narrationQueue: [],
  camera: { x: 0, y: 0 },
  particles: [],
  lastTime: 0,
  lastFootstep: 0,
  nearNPC: null,
  nearBuilding: null,
  nearItem: null,
  nearExit: false,
  nearBed: false,
  nearDiary: false,
  lastBuildingEntered: null,

  // 拾取动画状态
  itemFlyAnim: null,  // { item, startX, startY, progress }

  // 睡觉黑屏状态
  sleepFade: 0,       // 0~1，黑屏透明度
  isSleeping: false,  // 是否正在执行睡觉流程

  // 天数切换提示
  dayTransitionText: null,
  dayTransitionTimer: 0
};

// 存档
function saveGame() {
  const saveData = {
    day: GameState.day,
    timeElapsed: GameState.timeElapsed,
    emotions: GameState.emotions,
    inventory: GameState.inventory,
    discoveries: GameState.discoveries,
    npcFlags: GameState.npcFlags,
    npcLevels: GameState.npcLevels,
    visitedScenes: GameState.visitedScenes,
    collectedLetters: GameState.collectedLetters,
    keyItems: GameState.keyItems,
    flags: GameState.flags
  };
  localStorage.setItem('xinyu_save', JSON.stringify(saveData));
}

// 读档
function loadGame() {
  const save = localStorage.getItem('xinyu_save');
  if (save) {
    try {
      const data = JSON.parse(save);
      Object.assign(GameState, {
        day: data.day || 1,
        timeElapsed: data.timeElapsed || 0,
        emotions: data.emotions || { anxious: 30, calm: 30, brave: 30 },
        inventory: data.inventory || [],
        discoveries: data.discoveries || [],
        npcFlags: data.npcFlags || {},
        npcLevels: data.npcLevels || {},
        visitedScenes: data.visitedScenes || ['outdoor'],
        collectedLetters: data.collectedLetters || [],
        keyItems: data.keyItems || [],
        flags: data.flags || { gameStarted: false, hasDiary: false }
      });
      // 确保 dialogueHistory 存在（旧存档可能没有）
      if (!GameState.flags.dialogueHistory) {
        GameState.flags.dialogueHistory = {};
      }
      // 清理旧存档中残留的数字类型 discovery，统一为字符串ID
      if (GameState.discoveries && GameState.discoveries.length > 0) {
        const DISCOVERY_INDEX_MAP = {
          1: 'shell_found', 2: 'fangjie_bread', 3: 'chenbo_book', 4: 'button_found',
          5: 'drawing_found', 6: 'guanye_clock', 7: 'pangshu_story', 8: 'stamp_found',
          9: 'laozhou_light', 10: 'windmill_found', 11: 'lighthouse_model_found',
          12: 'key_found', 13: 'diary_sugar_paper', 14: 'diary_doodle', 15: 'cup_found',
          16: 'bookmark_found', 17: 'postcard_found', 18: 'flower_found',
          19: 'sea_glass_found', 20: 'lighthouse_key', 21: 'waipo_album',
          22: 'waipo_story', 23: 'fangjie_story'
        };
        const normalized = new Set();
        for (const d of GameState.discoveries) {
          const id = typeof d === 'number' ? (DISCOVERY_INDEX_MAP[d] || String(d)) : String(d);
          normalized.add(id);
        }
        GameState.discoveries = Array.from(normalized);
      }
    } catch(e) {
      console.warn('存档读取失败，使用默认状态');
    }
  }
}
