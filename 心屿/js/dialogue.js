// ==================== 对话系统 ====================

let DIALOGUE_DATA = {};

// 当前对话运行时状态
let currentDialogueNode = null;   // 匹配到的 dialogueTree 节点
let currentLineIndex = 0;          // 当前在 node.lines 数组中的索引
let typingTimer = null;
let currentTextIndex = 0;
let isTyping = false;
let currentDialogueNpcId = null;

// 选项 lines 播放状态
let currentOptionLines = null;     // 当前正在播放的选项 lines 数组
let currentOptionLineIndex = 0;    // 选项 lines 中的索引
let currentOptionIndex = null;     // 当前选项在 node.options 中的索引

// ==================== 数据加载 ====================

async function loadDialogueData(npcId) {
  if (!DIALOGUE_DATA[npcId]) {
    const response = await fetch(`data/dialogues/${npcId}.json`);
    DIALOGUE_DATA[npcId] = await response.json();
  }
  return DIALOGUE_DATA[npcId];
}

// ==================== 对话触发 ====================

function startDialogue(npc) {
  const data = DIALOGUE_DATA[npc.id];
  if (!data || !data.dialogueTree) {
    startDialogueWithNode(npc, {
      id: 'fallback',
      lines: [{ text: '……', options: [{ text: '（离开）' }] }]
    });
    return;
  }

  const node = findMatchingNode(npc.id);
  startDialogueWithNode(npc, node || findGenericNode(data.dialogueTree));
}

// 修复二：findMatchingNode 必须跳过已完成节点
function findMatchingNode(npcId) {
  const npcData = DIALOGUE_DATA[npcId];
  if (!npcData || !npcData.dialogueTree) {
    console.warn(`[Dialogue] 未找到 ${npcId} 的对话数据`);
    return null;
  }

  const tree = npcData.dialogueTree;
  const currentDay = GameState.day;
  const currentLocation = GameState.location;

  if (!GameState.flags.dialogueHistory) {
    GameState.flags.dialogueHistory = {};
  }

  console.log(`[Dialogue] 查找 ${npcId} 对话, day=${currentDay}, location=${currentLocation}`);

  // 检查节点是否已完成
  function isNodeCompleted(node) {
    // 优先检查 dialogueHistory（节点级完成标记）
    if (GameState.flags.dialogueHistory[node.id]) {
      return true;
    }
    // 检查节点是否有任意一个选项被选过（有选项的节点，选过任意一个就算完成）
    if (node.options && node.options.length > 0) {
      for (let i = 0; i < node.options.length; i++) {
        const optionKey = `${node.id}_opt${i}`;
        if (GameState.flags.dialogueHistory[optionKey]) {
          return true;
        }
      }
    }
    // 其次检查 setFlag（但只在 setFlag 是对话完成标记时）
    // 如果 setFlag 是物品/钥匙相关的标记，不应该阻止对话重复触发
    if (node.setFlag && GameState.flags[node.setFlag]) {
      const itemFlags = ['hasLighthouseKey', 'hasDiary'];
      if (!itemFlags.includes(node.setFlag)) {
        return true;
      }
    }
    return false;
  }

  // 第一轮：精确匹配当前day（day + location + condition）
  for (const node of tree) {
    if (node.day !== currentDay) continue;
    if (node.location !== currentLocation) continue;
    if (!checkNodeConditions(node)) continue;
    if (isNodeCompleted(node)) continue;
    console.log(`  ✅ 精确匹配到当前day节点: ${node.id}`);
    return node;
  }

  // 第二轮：当前day未完成节点（condition不满足但还没完成）
  for (const node of tree) {
    if (node.day !== currentDay) continue;
    if (node.location !== currentLocation) continue;
    if (!isNodeCompleted(node)) {
      console.log(`  ⚠️ 使用当前day未完成节点: ${node.id}`);
      return node;
    }
  }

  // 第三轮：同位置兜底（day=0 + location精确匹配，必须满足condition）
  for (const node of tree) {
    if (node.day !== 0) continue;
    if (node.location !== currentLocation) continue;
    if (node.id && node.id.endsWith('_generic')) continue;
    if (!checkNodeConditions(node)) continue;
    if (isNodeCompleted(node)) continue;
    console.log(`  ⚠️ 使用同位置day=0节点: ${node.id}`);
    return node;
  }

  // 第四轮：通用兜底（location: 'any' 或 generic）
  for (const node of tree) {
    if (node.location !== 'any' && !(node.id && node.id.endsWith('_generic'))) continue;
    if (isNodeCompleted(node)) continue;
    console.log(`  ⚠️ 使用通用兜底节点: ${node.id}`);
    return node;
  }

  return null;
}

function checkNodeConditions(node) {
  if (node.condition) {
    if (node.condition.flag) {
      const flagValue = GameState.flags[node.condition.flag];
      const actualValue = (flagValue === undefined) ? false : flagValue;
      if (actualValue !== node.condition.value) return false;
      if (node.condition.flag2) {
        const flagValue2 = GameState.flags[node.condition.flag2];
        const actualValue2 = (flagValue2 === undefined) ? false : flagValue2;
        if (actualValue2 !== node.condition.value2) return false;
      }
    }
    if (node.condition.flags) {
      for (const [flagName, requiredValue] of Object.entries(node.condition.flags)) {
        const flagValue = GameState.flags[flagName];
        const actualValue = (flagValue === undefined) ? false : flagValue;
        if (actualValue !== requiredValue) return false;
      }
    }
    if (node.condition.timeOfDay) {
      if (!node.condition.timeOfDay.includes(GameState.timeOfDay)) return false;
    }
  }
  if (node.condition2 && node.condition2.flag) {
    const flagValue2 = GameState.flags[node.condition2.flag];
    const actualValue2 = (flagValue2 === undefined) ? false : flagValue2;
    if (actualValue2 !== node.condition2.value) return false;
  }
  return true;
}

function findGenericNode(tree) {
  return tree.find(n => n.id && n.id.endsWith('_generic')) || tree[0];
}

function startDialogueWithNode(npc, node) {
  if (!node || !node.lines || node.lines.length === 0) return;

  currentDialogueNode = node;
  currentLineIndex = 0;
  currentOptionLines = null;
  currentOptionLineIndex = 0;
  currentOptionIndex = null;
  currentDialogueNpcId = npc.id;
  GameState.currentDialogue = { npc: npc, node: node };
  GameState.dialogueActive = true;

  // 立即应用节点级别的 setFlag（防止重复设置）
  if (node.setFlag) {
    GameState.flags[node.setFlag] = true;
  }

  // 立即应用节点级别的 setItem（防止重复获得）
  if (node.setItem && typeof addToInventory === 'function') {
    addToInventory(node.setItem);
  }

  // 立即应用节点级别的 discovery（防止重复触发）
  if (node.discovery && typeof unlockDiscovery === 'function') {
    const discKey = `${node.id}_discovery`;
    if (!GameState.flags.dialogueHistory) GameState.flags.dialogueHistory = {};
    if (!GameState.flags.dialogueHistory[discKey]) {
      GameState.flags.dialogueHistory[discKey] = true;
      unlockDiscovery(node.discovery);
    }
  }

  showDialogueBox(npc.id);
  playLine(node.lines[0]);
}

// ==================== 对话播放 ====================

function showDialogueBox(npcId) {
  const box = document.getElementById('dialog-box');
  const name = document.getElementById('dialog-name');
  name.textContent = getNPCName(npcId);
  box.classList.add('active');
}

function hideDialogueBox() {
  const box = document.getElementById('dialog-box');
  box.classList.remove('active');
  document.getElementById('dialog-options').innerHTML = '';
}

function playLine(line) {
  const textEl = document.getElementById('dialog-text');
  const optionsEl = document.getElementById('dialog-options');
  textEl.textContent = '';
  optionsEl.innerHTML = '';

  if (typingTimer) {
    clearInterval(typingTimer);
    typingTimer = null;
  }

  currentTextIndex = 0;
  isTyping = true;

  typingTimer = setInterval(() => {
    if (currentTextIndex < line.text.length) {
      textEl.textContent += line.text[currentTextIndex];
      currentTextIndex++;
    } else {
      clearInterval(typingTimer);
      typingTimer = null;
      isTyping = false;
      onLineEnd(line);
    }
  }, CONFIG.TYPING_SPEED);
}

function onLineEnd(line) {
  if (currentOptionLines) {
    const optionsEl = document.getElementById('dialog-options');
    optionsEl.innerHTML = '';
    
    const btn = document.createElement('button');
    btn.className = 'dialog-option';
    btn.textContent = '继续';
    btn.onclick = () => {
      currentOptionLineIndex++;
      if (currentOptionLineIndex < currentOptionLines.length) {
        playLine(currentOptionLines[currentOptionLineIndex]);
      } else {
        const option = currentDialogueNode.options[currentOptionIndex];
        const optionHasNext = option && (option.next !== undefined);
        const optionHasTrigger = option && option.triggerEnding;
        
        currentOptionLines = null;
        currentOptionLineIndex = 0;
        currentOptionIndex = null;
        
        if (option.triggerEnding) {
          endDialogue();
          setTimeout(() => {
            if (typeof showEndingChoices === 'function') {
              showEndingChoices();
            }
          }, 500);
        } else if (optionHasNext) {
          handleOptionNext(option);
        } else {
          checkAllOptionsChosenOrContinue();
        }
      }
    };
    optionsEl.appendChild(btn);
    return;
  }

  showOptions(line);
}

function showOptions(line) {
  const optionsEl = document.getElementById('dialog-options');
  optionsEl.innerHTML = '';

  // 优先使用行级别的 options，否则使用节点级别的 options
  let options = line.options;
  if (!options || options.length === 0) {
    options = currentDialogueNode.options;
  }

  if (!options || options.length === 0) {
    // 无选项，显示继续按钮
    const btn = document.createElement('button');
    btn.className = 'dialog-option';
    btn.textContent = '继续';
    btn.onclick = () => advanceFromLine();
    optionsEl.appendChild(btn);
    return;
  }

  showDialogueOptions(options);
}

function showDialogueOptions(options) {
  const container = document.getElementById('dialog-options');
  container.innerHTML = '';
  
  // 过滤掉已选过的选项
  const unchosenOptions = options.filter((opt, index) => {
    const optionKey = `${currentDialogueNode.id}_opt${index}`;
    return !GameState.flags.dialogueHistory?.[optionKey];
  });
  
  // 如果所有选项都已选过，显示继续按钮
  if (unchosenOptions.length === 0) {
    const btn = document.createElement('button');
    btn.className = 'dialog-option';
    btn.textContent = '继续';
    btn.onclick = () => endDialogue();
    container.appendChild(btn);
    return;
  }
  
  // 只显示未选过的选项
  unchosenOptions.forEach((opt, index) => {
    // 找到原始索引
    const originalIndex = options.indexOf(opt);
    const btn = document.createElement('button');
    btn.className = 'dialog-option';
    btn.textContent = opt.text;
    btn.onclick = () => selectOption(opt, originalIndex);
    container.appendChild(btn);
  });
}

function advanceFromLine() {
  const node = currentDialogueNode;
  if (currentLineIndex < node.lines.length - 1) {
    currentLineIndex++;
    playLine(node.lines[currentLineIndex]);
  } else {
    // 所有 lines 播完了
    if (node.options && node.options.length > 0) {
      showDialogueOptions(node.options);
    } else {
      endDialogue();
    }
  }
}

function selectOption(option, optionIndex) {
  const node = GameState.currentDialogue.node;
  const nodeId = node.id;
  const optionKey = `${nodeId}_opt${optionIndex}`;
  
  if (!GameState.flags.dialogueHistory) {
    GameState.flags.dialogueHistory = {};
  }
  
  const alreadyChosen = GameState.flags.dialogueHistory[optionKey];
  GameState.flags.dialogueHistory[optionKey] = true;
  
  // 只在首次选择时应用效果
  if (!alreadyChosen) {
    if (option.emotion) {
      Object.keys(option.emotion).forEach(key => {
        GameState.emotions[key] = Math.max(0, Math.min(100, 
          (GameState.emotions[key] || 0) + option.emotion[key]));
      });
      if (typeof updateEmotionUI === 'function') updateEmotionUI();
    }
    if (option.setItem && typeof addToInventory === 'function') {
      addToInventory(option.setItem);
    }
    if (option.discovery && typeof unlockDiscovery === 'function') {
      unlockDiscovery(option.discovery);
    }
    if (option.setFlag) {
      GameState.flags[option.setFlag] = true;
    }
  }
  
  // 触发结局选择界面
  if (option.triggerEnding) {
    endDialogue();
    setTimeout(() => {
      if (typeof showEndingChoices === 'function') {
        showEndingChoices();
      }
    }, 500);
    return;
  }
  
  // 选项有 lines，逐行播放
  if (option.lines && option.lines.length > 0) {
    currentOptionIndex = optionIndex;
    currentOptionLines = option.lines;
    currentOptionLineIndex = 0;
    playLine(option.lines[0]);
    return;
  }
  
  // 清空选项面板
  document.getElementById('dialog-options').innerHTML = '';
  
  // 推进对话
  if (option.next !== undefined) {
    handleOptionNext(option);
  } else {
    endDialogue();
  }
}

function handleOptionNext(option) {
  const next = option.next;
  const node = currentDialogueNode;

  if (typeof next === 'number') {
    // 数字：跳转到当前节点 lines 数组的第 N 行（索引）
    if (node.lines && next < node.lines.length) {
      currentLineIndex = next;
      playLine(node.lines[next]);
    } else {
      // next 越界，检查是否所有选项都选过
      checkAllOptionsChosenOrContinue();
    }
  } else if (typeof next === 'string') {
    // 字符串：跳转到另一个节点的 id
    const data = DIALOGUE_DATA[currentDialogueNpcId];
    if (data && data.dialogueTree) {
      const targetNode = data.dialogueTree.find(n => n.id === next);
      if (targetNode) {
        currentDialogueNode = targetNode;
        currentLineIndex = 0;
        currentOptionLines = null;
        currentOptionLineIndex = 0;
        currentOptionIndex = null;
        playLine(targetNode.lines[0]);
      } else {
        checkAllOptionsChosenOrContinue();
      }
    } else {
      checkAllOptionsChosenOrContinue();
    }
  } else {
    // next 为 undefined：检查是否所有选项都选过
    checkAllOptionsChosenOrContinue();
  }
}

function checkAllOptionsChosenOrContinue() {
  const node = currentDialogueNode;
  if (!node || !node.options || node.options.length === 0) {
    endDialogue();
    return;
  }

  // 三选一逻辑：只要有一个选项被选过，就结束对话
  const anyOptionChosen = node.options.some((opt, i) => {
    const key = `${node.id}_opt${i}`;
    return GameState.flags.dialogueHistory[key];
  });

  if (anyOptionChosen) {
    endDialogue();
  } else {
    showDialogueOptions(node.options);
  }
}

// ==================== 对话推进（空格/回车/E） ====================

function advanceDialogue() {
  // 正在打字时，点击立即显示完整文字
  if (isTyping) {
    clearInterval(typingTimer);
    typingTimer = null;
    const line = currentOptionLines
      ? currentOptionLines[currentOptionLineIndex]
      : (currentDialogueNode && currentDialogueNode.lines[currentLineIndex]);
    if (line) {
      document.getElementById('dialog-text').textContent = line.text;
    }
    isTyping = false;
    onLineEnd(line || {});
    return;
  }
  // 否则不做事（选项需要玩家手动点击）
}

// ==================== 对话结束 ====================

// 修复一：endDialogue 必须标记节点完成
function endDialogue() {
  if (typingTimer) {
    clearInterval(typingTimer);
    typingTimer = null;
  }
  isTyping = false;

  const node = GameState.currentDialogue?.node;
  if (node) {
    // 1. 标记节点完成（但有 setItem 的节点不标记，允许重复触发）
    if (!GameState.flags.dialogueHistory) {
      GameState.flags.dialogueHistory = {};
    }
    
    // 检查是否有任意一个选项被选过
    let anyOptionChosen = false;
    if (node.options && node.options.length > 0) {
      for (let i = 0; i < node.options.length; i++) {
        const optKey = `${node.id}_opt${i}`;
        if (GameState.flags.dialogueHistory[optKey]) {
          anyOptionChosen = true;
          break;
        }
      }
    }
    
    // 无选项的节点，或有任意一个选项被选过的节点，标记为完成
    if (!node.options || node.options.length === 0 || anyOptionChosen) {
      GameState.flags.dialogueHistory[node.id] = true;
    }

    // 2. 设置节点的 setFlag
    if (node.setFlag) {
      GameState.flags[node.setFlag] = true;
    }

    // 3. 处理节点级别的 discovery（防止重复触发）
    if (node.discovery) {
      const discKey = `${node.id}_discovery`;
      if (!GameState.flags.dialogueHistory[discKey]) {
        GameState.flags.dialogueHistory[discKey] = true;
        if (typeof unlockDiscovery === 'function') {
          unlockDiscovery(node.discovery);
        }
      }
    }

    // 4. 处理节点级别的 setItem（节点级道具）
    if (node.setItem) {
      const itemKey = `${node.id}_item`;
      if (!GameState.flags.dialogueHistory[itemKey]) {
        GameState.flags.dialogueHistory[itemKey] = true;
        if (typeof addToInventory === 'function') {
          addToInventory(node.setItem);
        }
      }
    }
  }

  if (currentDialogueNpcId) {
    GameState.npcLevels[currentDialogueNpcId] = (GameState.npcLevels[currentDialogueNpcId] || 0) + 1;
  }

  currentDialogueNode = null;
  currentLineIndex = 0;
  currentOptionLines = null;
  currentOptionLineIndex = 0;
  currentOptionIndex = null;
  currentDialogueNpcId = null;
  GameState.currentDialogue = null;
  GameState.dialogueActive = false;

  hideDialogueBox();
  saveGame();
  checkPostDialogueEvents();
}

function checkPostDialogueEvents() {
  if (typeof NarrationSystem === 'undefined') return;
  
  const npcId = currentDialogueNpcId || (GameState.currentDialogue?.npc?.id);
  if (!npcId) return;
  
  const day = GameState.day;
  
  const triggerMap = {
    'fangjie_day1_done': 'fangjie_done',
    'chenbo_day1_done': 'chenbo_done',
    'guanye_day2_done': 'guanye_done',
    'pangshu_day2_done': 'pangshu_done',
    'laozhou_day3_done': 'laozhou_done',
    'help_laozhou': 'help_laozhou'
  };
  
  for (const [flag, trigger] of Object.entries(triggerMap)) {
    if (GameState.flags[flag]) {
      NarrationSystem.trigger(trigger);
    }
  }
  
  if (GameState.flags.day1Completed && !GameState.flags.day2Started && GameState.day === 1) {
  }
}

// ==================== 辅助函数 ====================

function getNPCName(npcId) {
  const names = {
    fangjie: '方姐',
    chenbo: '陈伯',
    laozhou: '老周',
    pangshu: '胖叔',
    guanye: '关爷',
    waipo: '外婆',
    waigong: '外公'
  };
  return names[npcId] || 'NPC';
}

function showLocationName(name) {
  const el = document.getElementById('location-name');
  el.textContent = name;
  el.classList.remove('active');
  void el.offsetWidth;
  el.classList.add('active');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function addToInventory(itemId) {
  // 从 MAP_DATA.items 或 INTERIOR_DATA items 查找物品信息
  let item = null;
  if (typeof MAP_DATA !== 'undefined' && MAP_DATA && MAP_DATA.items) {
    item = MAP_DATA.items.find(i => i.id === itemId);
  }
  if (!item) {
    // 内部道具表
    const itemTable = {
      lighthouse_key: { id: 'lighthouse_key', name: '灯塔钥匙', icon: '🔑', desc: '外婆给的灯塔钥匙。' },
      croissant_bag: { id: 'croissant_bag', name: '一袋牛角包', icon: '🥐', desc: '外婆塞的牛角包，路上吃。' },
      diary: { id: 'diary', name: '外婆的日记本', icon: '📔', desc: '外婆年轻时的日记。' },
      nameless_book: { id: 'nameless_book', name: '无名书', icon: '📖', desc: '外婆年轻时借阅的旧书，扉页有她的名字。' },
      pocket_watch: { id: 'pocket_watch', name: '怀表', icon: '⌚', desc: '外婆年轻时的怀表，里面有她的照片。' },
      bread_recipe: { id: 'bread_recipe', name: '面包配方', icon: '📜', desc: '外婆手写的面包配方，泛黄了。' }
    };
    item = itemTable[itemId];
  }
  if (item && !GameState.inventory.find(i => i.id === item.id)) {
    GameState.inventory.push(item);
  }
}

// 数字索引到字符串ID的映射表
const DISCOVERY_INDEX_MAP = {
  1: 'shell_found',
  2: 'fangjie_bread',
  3: 'chenbo_book',
  4: 'button_found',
  5: 'drawing_found',
  6: 'guanye_clock',
  7: 'pangshu_story',
  8: 'stamp_found',
  9: 'laozhou_light',
  10: 'windmill_found',
  11: 'lighthouse_model_found',
  12: 'key_found',
  13: 'diary_sugar_paper',
  14: 'diary_doodle',
  15: 'cup_found',
  16: 'bookmark_found',
  17: 'postcard_found',
  18: 'flower_found',
  19: 'sea_glass_found',
  20: 'lighthouse_key',
  21: 'waipo_album',
  22: 'waipo_story',
  23: 'fangjie_story'
};

function normalizeDiscoveryId(discovery) {
  if (typeof discovery === 'number') {
    return DISCOVERY_INDEX_MAP[discovery] || String(discovery);
  }
  return String(discovery);
}

function unlockDiscovery(discovery) {
  const discoveryId = normalizeDiscoveryId(discovery);

  // 去重：已存在则不再添加
  if (GameState.discoveries.includes(discoveryId)) return;

  GameState.discoveries.push(discoveryId);
  console.log('解锁小发现:', discoveryId, '当前列表:', GameState.discoveries);

  if (typeof showDiscoveryCard === 'function') {
    showDiscoveryCard(discoveryId);
  }
  if (typeof updateDiscoveryCount === 'function') {
    updateDiscoveryCount();
  }
  if (typeof saveGame === 'function') {
    saveGame();
  }
}

if (typeof window !== 'undefined') {
  window.addToInventory = addToInventory;
  window.unlockDiscovery = unlockDiscovery;
}
