// ==================== 交互系统 ====================
// 统一处理：E键（对话/拾取/阅读日记）、空格键（进入/离开建筑、睡觉）
// 以及靠近检测、拾取逻辑、睡觉推进天数逻辑

// ==================== 按键处理 ====================

function handleInteractE() {
  // 对话进行中：推进对话
  if (GameState.currentDialogue) {
    advanceDialogue();
    return;
  }

  // E键：NPC对话 → 道具拾取 → 阅读日记（优先级从高到低）
  if (GameState.nearNPC) {
    startDialogue(GameState.nearNPC);
  } else if (GameState.nearItem) {
    collectItem(GameState.nearItem);
  } else if (GameState.nearDiary) {
    readDiary();
  }
}

function handleInteractSpace() {
  // 对话进行中：推进对话
  if (GameState.currentDialogue) {
    advanceDialogue();
    return;
  }

  // 空格键：离开建筑 → 进入建筑 → 睡觉
  if (GameState.nearExit && GameState.location !== 'outdoor') {
    leaveBuilding();
  } else if (GameState.nearBuilding) {
    enterBuilding(GameState.nearBuilding);
  } else if (GameState.nearBed) {
    restInBed();
  }
}

// ==================== 靠近检测 ====================

function checkProximity() {
  GameState.nearNPC = null;
  GameState.nearBuilding = null;
  GameState.nearItem = null;
  GameState.nearBed = false;
  GameState.nearDiary = false;
  GameState.nearExit = false;

  if (GameState.location === 'outdoor') {
    checkNearNPCs();
    checkNearBuildings();
    checkNearItems();
  } else {
    checkNearIndoorNPCs();
    checkNearIndoorItems();
    checkNearBed();
    checkNearExit();
  }
}

// --- 室外检测 ---

function checkNearNPCs() {
  if (!MAP_DATA) return;
  const bs = CONFIG.BLOCK_SIZE;

  for (const npc of MAP_DATA.npcs) {
    // 外公 Day2/Day3 不在室外
    if (npc.id === 'waigong') {
      if (GameState.day >= 2) {
        continue;
      }
    }
    const npcPxX = npc.x * bs;
    const npcPxY = npc.y * bs;
    const d = distance(GameState.player.x, GameState.player.y, npcPxX, npcPxY);
    if (d < CONFIG.INTERACT_DISTANCE) {
      GameState.nearNPC = npc;
      return;
    }
  }
}

function checkNearBuildings() {
  if (!MAP_DATA) return;
  const bs = CONFIG.BLOCK_SIZE;

  for (const b of MAP_DATA.buildings) {
    if (b.locked) continue;
    const ex = (b.entrance ? b.entrance.x : b.x + b.w / 2) * bs;
    const ey = (b.entrance ? b.entrance.y : b.y + b.h) * bs;
    const d = distance(GameState.player.x, GameState.player.y, ex, ey);
    if (d < CONFIG.INTERACT_DISTANCE) {
      GameState.nearBuilding = b;
      return;
    }
  }
}

function checkNearItems() {
  if (!MAP_DATA) return;
  const bs = CONFIG.BLOCK_SIZE;

  for (const item of MAP_DATA.items) {
    if (GameState.inventory.some(i => i.id === item.id)) continue;
    if (item.unlockDay && GameState.day < item.unlockDay) continue;
    const ix = item.x * bs;
    const iy = item.y * bs;
    const d = distance(GameState.player.x, GameState.player.y, ix, iy);
    if (d < CONFIG.INTERACT_DISTANCE) {
      GameState.nearItem = item;
      return;
    }
  }
}

// --- 室内检测 ---

function checkNearIndoorNPCs() {
  const npcs = getIndoorNPCs(GameState.location);
  for (const npc of npcs) {
    const d = distance(GameState.player.x, GameState.player.y, npc.x, npc.y);
    if (d < CONFIG.INTERACT_DISTANCE) {
      GameState.nearNPC = npc;
      return;
    }
  }
}

function checkNearIndoorItems() {
  const data = INTERIOR_DATA[GameState.location];
  if (!data || !data.items) return;

  const roomW = CONFIG.CANVAS_WIDTH * CONFIG.ROOM_WIDTH_RATIO;
  const roomH = CONFIG.CANVAS_HEIGHT * CONFIG.ROOM_HEIGHT_RATIO;
  const roomX = (CONFIG.CANVAS_WIDTH - roomW) / 2;
  const roomY = (CONFIG.CANVAS_HEIGHT - roomH) / 2;

  for (const item of data.items) {
    if (GameState.inventory.some(i => i.id === item.id)) continue;
    if (item.interaction === 'read_diary' && GameState.flags.hasDiary) continue;
    if (item.unlockDay && GameState.day < item.unlockDay) continue;

    // 道具坐标相对于房间，需加上 roomX/roomY 偏移
    const itemWorldX = roomX + item.x;
    const itemWorldY = roomY + item.y;
    const d = distance(GameState.player.x, GameState.player.y, itemWorldX, itemWorldY);
    if (d < CONFIG.INTERACT_DISTANCE) {
      if (item.interaction === 'read_diary') {
        GameState.nearDiary = true;
      } else {
        GameState.nearItem = item;
      }
      return;
    }
  }
}

function checkNearBed() {
  if (GameState.location !== 'oldhouse') return;
  const data = INTERIOR_DATA['oldhouse'];
  if (!data || !data.furniture) return;

  const roomX = (CONFIG.CANVAS_WIDTH - CONFIG.CANVAS_WIDTH * CONFIG.ROOM_WIDTH_RATIO) / 2;
  const roomY = (CONFIG.CANVAS_HEIGHT - CONFIG.CANVAS_HEIGHT * CONFIG.ROOM_HEIGHT_RATIO) / 2;

  for (const f of data.furniture) {
    if (f.id === 'sofa') {
      const fx = roomX + f.x + f.w / 2;
      const fy = roomY + f.y + f.h / 2;
      const d = distance(GameState.player.x, GameState.player.y, fx, fy);
      if (d < CONFIG.INTERACT_DISTANCE) {
        GameState.nearBed = true;
        return;
      }
    }
  }
}

function checkNearExit() {
  const bs = CONFIG.BLOCK_SIZE;
  const roomH = CONFIG.CANVAS_HEIGHT * 0.7;
  const roomY = (CONFIG.CANVAS_HEIGHT - roomH) / 2;

  if (GameState.player.y > roomY + roomH - bs * 1.2) {
    GameState.nearExit = true;
  }
}

// ==================== 建筑进出 ====================

function enterBuilding(building) {
  if (building.locked) {
    showItemPopup('门锁着，还进不去', GameState.player.x, GameState.player.y);
    return;
  }
  GameState.location = building.id;
  
  if (typeof NarrationSystem !== 'undefined') {
    const triggerMap = {
      'bakery': 'enter_bakery',
      'bookstore': 'enter_bookstore',
      'repairshop': 'enter_repairshop',
      'lighthouse': 'enter_lighthouse'
    };
    if (triggerMap[building.id]) {
      NarrationSystem.trigger(triggerMap[building.id]);
    }
  }

  const roomW = CONFIG.CANVAS_WIDTH * 0.65;
  const roomH = CONFIG.CANVAS_HEIGHT * 0.7;
  const roomX = (CONFIG.CANVAS_WIDTH - roomW) / 2;
  const roomY = (CONFIG.CANVAS_HEIGHT - roomH) / 2;

  GameState.player.x = roomX + roomW / 2;
  GameState.player.y = roomY + roomH - 10;
  GameState.player.dir = 'up';

  const bs = CONFIG.BLOCK_SIZE;
  GameState.lastBuildingEntered = {
    id: building.id,
    exitX: (building.entrance ? building.entrance.x : building.x + building.w / 2) * bs,
    exitY: (building.entrance ? building.entrance.y : building.y + building.h) * bs + bs * 0.5
  };

  if (!GameState.visitedScenes.includes(building.id)) {
    GameState.visitedScenes.push(building.id);
  }

  saveGame();
}

function leaveBuilding() {
  const last = GameState.lastBuildingEntered;
  const buildingId = last ? last.id : GameState.location;
  
  if (last) {
    GameState.player.x = last.exitX;
    GameState.player.y = last.exitY;
  } else {
    GameState.player.x = 14.5 * CONFIG.BLOCK_SIZE + 16;
    GameState.player.y = 16 * CONFIG.BLOCK_SIZE + 16;
  }
  GameState.player.dir = 'down';
  GameState.location = 'outdoor';
  updateCamera();
  
  if (typeof NarrationSystem !== 'undefined') {
    const triggerMap = {
      'bakery': 'leave_bakery',
      'repairshop': 'leave_repairshop',
      'diner': 'leave_diner'
    };
    if (triggerMap[buildingId]) {
      NarrationSystem.trigger(triggerMap[buildingId]);
    }
  }
  
  saveGame();
}

// ==================== 道具拾取 ====================

function collectItem(item) {
  if (GameState.inventory.some(i => i.id === item.id)) return;

  console.log('=== 拾取道具 ===');
  console.log('道具ID:', item.id, '名称:', item.name);
  console.log('discoveryId:', item.discoveryId, 'unlockDay:', item.unlockDay);

  GameState.itemFlyAnim = {
    item: item,
    startX: GameState.player.x,
    startY: GameState.player.y - 30,
    progress: 0
  };

  setTimeout(() => {
    GameState.inventory.push(item);
    GameState.itemFlyAnim = null;

    showItemPopup(`获得 ${item.name}`, GameState.player.x, GameState.player.y);

    if (item.type === 'key') {
      GameState.keyItems.push(item.id);
      const keyFlags = {
        'diary': 'hasDiary',
        'nameless_book': 'hasNamelessBook',
        'pocket_watch': 'hasPocketWatch',
        'bread_recipe': 'hasBreadRecipe',
        'lighthouse_key': 'hasLighthouseKey'
      };
      if (keyFlags[item.id]) {
        GameState.flags[keyFlags[item.id]] = true;
      }
      if (item.id === 'lighthouse_key' && typeof NarrationSystem !== 'undefined') {
        NarrationSystem.trigger('get_key');
      }
    }

    const discId = item.discoveryId;
    if (discId && !GameState.discoveries.includes(discId)) {
      GameState.discoveries.push(discId);
      console.log('解锁小发现:', discId);
      showDiscoveryCard(discId);
      updateDiscoveryCount();
    }

    console.log('当前小发现列表:', GameState.discoveries);

    renderBackpack();
    saveGame();
  }, 300);
}

function updateItemFlyAnim(deltaTime) {
  if (!GameState.itemFlyAnim) return;
  GameState.itemFlyAnim.progress += deltaTime / 0.3;
  if (GameState.itemFlyAnim.progress > 1) {
    GameState.itemFlyAnim.progress = 1;
  }
}

// ==================== 阅读日记 ====================

let DIARY_DATA = null;
let diaryPages = [];
let currentDiaryPage = 0;

async function loadDiaryData() {
  if (DIARY_DATA) return;
  try {
    const response = await fetch('data/diary.json');
    DIARY_DATA = await response.json();
  } catch (e) {
    console.error('加载日记数据失败:', e);
    DIARY_DATA = [];
  }
}

async function readDiary() {
  if (!GameState.flags.hasDiary) {
    GameState.flags.hasDiary = true;
    saveGame();
  }

  if (!diaryPages.length) {
    await loadDiaryData();
    diaryPages = DIARY_DATA || [];
  }
  
  const filteredPages = diaryPages.filter(p => p.day <= GameState.day);
  console.log('日记页面数:', filteredPages.length, '当前天数:', GameState.day);
  
  if (filteredPages.length === 0) {
    showLetter('日记本是空白的...');
    return;
  }
  
  currentDiaryPage = 0;
  showDiaryPage(filteredPages);

  if (typeof NarrationSystem !== 'undefined' && !GameState.flags.firstDiaryRead) {
    GameState.flags.firstDiaryRead = true;
    NarrationSystem.trigger('first_diary');
  }

  if (!GameState.discoveries.includes('diary_sugar_paper')) {
    GameState.discoveries.push('diary_sugar_paper');
    if (typeof showDiscoveryCard === 'function') showDiscoveryCard('diary_sugar_paper');
  }
  if (!GameState.discoveries.includes('diary_doodle')) {
    GameState.discoveries.push('diary_doodle');
    if (typeof showDiscoveryCard === 'function') showDiscoveryCard('diary_doodle');
  }
  if (typeof updateDiscoveryCount === 'function') updateDiscoveryCount();
  saveGame();
}

function showDiaryPage(pages) {
  const page = pages[currentDiaryPage];
  document.getElementById('letter-text').textContent = 
    `【${page.title}】\n\n${page.text}`;
  document.getElementById('diary-page-indicator').textContent = 
    `${currentDiaryPage + 1}/${pages.length}`;
  
  // 日记模式：显示翻页按钮
  const pageNav = document.getElementById('diary-prev-btn')?.parentElement;
  if (pageNav) pageNav.style.display = 'block';
  
  document.getElementById('diary-prev-btn').style.display = 
    currentDiaryPage > 0 ? 'inline-block' : 'none';
  document.getElementById('diary-next-btn').style.display = 
    currentDiaryPage < pages.length - 1 ? 'inline-block' : 'none';
  
  document.getElementById('letter-panel').classList.add('active');
}

function closeLetter() {
  document.getElementById('letter-panel').classList.remove('active');
}

document.getElementById('diary-prev-btn').onclick = () => {
  const pages = diaryPages.filter(p => p.day <= GameState.day);
  if (currentDiaryPage > 0) {
    currentDiaryPage--;
    showDiaryPage(pages);
  }
};

document.getElementById('diary-next-btn').onclick = () => {
  const pages = diaryPages.filter(p => p.day <= GameState.day);
  if (currentDiaryPage < pages.length - 1) {
    currentDiaryPage++;
    showDiaryPage(pages);
  }
};

// ==================== 睡觉推进天数 ====================

function restInBed() {
  if (GameState.isSleeping) return;

  // Day3：提示去灯塔
  if (GameState.day >= 3) {
    showItemPopup('去灯塔做最后的决定吧', GameState.player.x, GameState.player.y);
    return;
  }

  // Day1 条件：已读日记 + 见过方姐和陈伯
  if (GameState.day === 1) {
    if (!GameState.flags.hasDiary) {
      showItemPopup('先去看看书桌上的日记本吧', GameState.player.x, GameState.player.y);
      return;
    }
    if (!GameState.flags.metFangjie || !GameState.flags.metChenbo) {
      showItemPopup('去镇上看看方姐和陈伯吧', GameState.player.x, GameState.player.y);
      return;
    }
  }

  // Day2 条件：见过关爷和胖叔
  if (GameState.day === 2) {
    if (!GameState.flags.metGuanye || !GameState.flags.metPangshu) {
      showItemPopup('去见见关爷和胖叔吧', GameState.player.x, GameState.player.y);
      return;
    }
  }

  // 开始睡觉流程
  GameState.isSleeping = true;
  GameState.sleepFade = 0;

  // 睡前旁白
  if (typeof NarrationSystem !== 'undefined') {
    if (GameState.day === 1) {
      NarrationSystem.trigger('day1_sleep');
    } else if (GameState.day === 2) {
      NarrationSystem.trigger('day2_sleep');
    }
  }

  // 0.5秒黑屏后推进天数
  setTimeout(() => {
    const prevDay = GameState.day;
    GameState.day += 1;
    GameState.timeOfDay = 'morning';
    GameState.timeElapsed = 0;

    // 睡觉效果：只减焦虑，平静和勇气不变
    GameState.emotions.anxious = Math.max(0, GameState.emotions.anxious - 10);

    // 场景解锁
    if (GameState.day === 2) {
      const repairshop = MAP_DATA.buildings.find(b => b.id === 'repairshop');
      if (repairshop) repairshop.locked = false;
      const diner = MAP_DATA.buildings.find(b => b.id === 'diner');
      if (diner) diner.locked = false;
      GameState.flags.day1Completed = true;
      GameState.flags.day2Started = true;
      
      if (typeof NarrationSystem !== 'undefined') {
        NarrationSystem.trigger('day2_start');
      }
    } else if (GameState.day === 3) {
      const lighthouse = MAP_DATA.buildings.find(b => b.id === 'lighthouse');
      if (lighthouse) lighthouse.locked = false;
      GameState.flags.day2Completed = true;
      GameState.flags.day3Started = true;
    }

    // 玩家回到老房子室内（早晨醒来）
    const roomW = CONFIG.CANVAS_WIDTH * CONFIG.ROOM_WIDTH_RATIO;
    const roomH = CONFIG.CANVAS_HEIGHT * CONFIG.ROOM_HEIGHT_RATIO;
    const roomX = (CONFIG.CANVAS_WIDTH - roomW) / 2;
    const roomY = (CONFIG.CANVAS_HEIGHT - roomH) / 2;
    GameState.player.x = roomX + roomW * 0.3;
    GameState.player.y = roomY + roomH * 0.8;
    GameState.player.dir = 'down';

    // 更新 UI
    updateEmotionUI();
    updateDayUI();

    // 显示天数提示
    GameState.dayTransitionText = `第 ${GameState.day} 天的清晨`;
    GameState.dayTransitionTimer = 2.5;

    saveGame();

    // 0.5秒后开始淡出黑屏
  setTimeout(() => {
    GameState.isSleeping = false;
    console.log('=== 睡眠结束 ===');
    console.log('Day:', GameState.day, 'TimeOfDay:', GameState.timeOfDay);
    console.log('Location:', GameState.location);
    console.log('Player:', GameState.player.x, GameState.player.y);
    console.log('sleepFade:', GameState.sleepFade);
    console.log('================');
  }, 500);
}, 500);
}

function updateSleepFade(deltaTime) {
  if (GameState.isSleeping) {
    GameState.sleepFade = Math.min(1, GameState.sleepFade + deltaTime / 0.5);
  } else if (GameState.sleepFade > 0) {
    GameState.sleepFade = Math.max(0, GameState.sleepFade - deltaTime / 0.5);
  }
}

function updateDayTransition(deltaTime) {
  if (GameState.dayTransitionTimer > 0) {
    GameState.dayTransitionTimer -= deltaTime;
    if (GameState.dayTransitionTimer <= 0) {
      GameState.dayTransitionText = null;
      GameState.dayTransitionTimer = 0;
    }
  }
}

// ==================== 室内 NPC 配置 ====================

function getIndoorNPCs(location) {
  const roomW = CONFIG.CANVAS_WIDTH * CONFIG.ROOM_WIDTH_RATIO;
  const roomH = CONFIG.CANVAS_HEIGHT * CONFIG.ROOM_HEIGHT_RATIO;
  const roomX = (CONFIG.CANVAS_WIDTH - roomW) / 2;
  const roomY = (CONFIG.CANVAS_HEIGHT - roomH) / 2;

  const npcConfigs = {
    oldhouse: (() => {
      const npcs = [
        { id: 'waipo', type: 'waipo', xRatio: 0.3, yRatio: 0.7 }
      ];
      // Day2/Day3 外公全天在室内
      if (GameState.day >= 2) {
        npcs.push({ id: 'waigong', type: 'waigong', xRatio: 0.65, yRatio: 0.75 });
      }
      return npcs;
    })(),
    bakery: [
      { id: 'fangjie', type: 'fangjie', xRatio: 0.7, yRatio: 0.55 }
    ],
    bookstore: [
      { id: 'chenbo', type: 'chenbo', xRatio: 0.65, yRatio: 0.6 }
    ],
    lighthouse: [
      { id: 'laozhou', type: 'laozhou', xRatio: 0.3, yRatio: 0.7 }
    ],
    diner: [
      { id: 'pangshu', type: 'pangshu', xRatio: 0.5, yRatio: 0.45 }
    ],
    repairshop: [
      { id: 'guanye', type: 'guanye', xRatio: 0.6, yRatio: 0.6 }
    ]
  };

  const configs = npcConfigs[location] || [];
  return configs.map(c => ({
    id: c.id,
    type: c.type,
    x: roomX + c.xRatio * roomW,
    y: roomY + c.yRatio * roomH,
    dir: 'down'
  }));
}

// ==================== 辅助函数 ====================

function addDiscovery(discovery) {
  if (!GameState.discoveries.includes(discovery)) {
    GameState.discoveries.push(discovery);
    updateDiscoveryCount();
    saveGame();
  }
}

function modifyEmotion(emotion, value) {
  GameState.emotions[emotion] = Math.max(0, Math.min(100, GameState.emotions[emotion] + value));
  updateEmotionUI();
  saveGame();
}
