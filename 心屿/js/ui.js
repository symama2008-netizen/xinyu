let introStep = 0;

function initUI() {
  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-backpack').addEventListener('click', toggleBackpack);
  document.getElementById('btn-discovery').addEventListener('click', toggleDiscovery);
  document.getElementById('btn-music').addEventListener('click', toggleMusic);
  document.getElementById('intro-next').addEventListener('click', nextIntro);
  
  document.getElementById('intro-screen').addEventListener('click', (e) => {
    if (e.target.id !== 'intro-next') nextIntro();
  });
}

function startGame() {
  document.getElementById('start-screen').style.display = 'none';
  GameState.flags.gameStarted = true;
  
  if (typeof NarrationSystem !== 'undefined' && typeof NarrationSystem.init === 'function') {
    NarrationSystem.init();
  }
  
  if (typeof OpeningScene !== 'undefined' && typeof OpeningScene.start === 'function') {
    OpeningScene.start();
  } else {
    document.getElementById('intro-screen').classList.add('active');
    initIntroDots();
  }
}

function initIntroDots() {
  const dots = document.getElementById('intro-dots');
  for (let i = 0; i < 4; i++) {
    const dot = document.createElement('div');
    dot.className = 'intro-dot';
    if (i === 0) dot.classList.add('active');
    dots.appendChild(dot);
  }
}

function nextIntro() {
  const texts = document.querySelectorAll('.intro-text');
  const dots = document.querySelectorAll('.intro-dot');
  
  texts[introStep].classList.remove('active');
  dots[introStep].classList.remove('active');
  
  introStep++;
  
  if (introStep >= texts.length) {
    document.getElementById('intro-screen').classList.remove('active');
    GameState.flags.openingComplete = true;
    startGameLoop();
  } else {
    texts[introStep].classList.add('active');
    dots[introStep].classList.add('active');
  }
}

function toggleBackpack() {
  const panel = document.getElementById('backpack-panel');
  panel.classList.toggle('active');
  if (panel.classList.contains('active')) {
    renderBackpack();
  }
}

function closeBackpack() {
  document.getElementById('backpack-panel').classList.remove('active');
}

function renderBackpack() {
  const grid = document.getElementById('backpack-grid');
  grid.innerHTML = '';
  
  for (let i = 0; i < 24; i++) {
    const slot = document.createElement('div');
    slot.className = 'backpack-slot';
    
    if (i < GameState.inventory.length) {
      const item = GameState.inventory[i];
      slot.textContent = item.icon || '📦';
      slot.addEventListener('click', () => showItemDetail(item));
    }
    
    grid.appendChild(slot);
  }
}

function showItemDetail(item) {
  const panel = document.getElementById('item-detail-panel');
  document.getElementById('item-detail-icon').textContent = item.icon || '📦';
  document.getElementById('item-detail-name').textContent = item.name || '物品';
  document.getElementById('item-detail-desc').textContent = item.desc || '没有描述';
  panel.classList.add('active');
}

function closeItemDetail() {
  document.getElementById('item-detail-panel').classList.remove('active');
}

function toggleDiscovery() {
  const panel = document.getElementById('discovery-panel');
  panel.classList.toggle('active');
  if (panel.classList.contains('active')) {
    renderDiscovery();
  }
}

function closeDiscovery() {
  document.getElementById('discovery-panel').classList.remove('active');
}

function renderDiscovery() {
  const grid = document.getElementById('discovery-grid');
  grid.innerHTML = '';

  const allKeys = Object.keys(DISCOVERY_DATA);
  const total = getTotalDiscoveries();

  for (const key of allKeys) {
    const info = DISCOVERY_DATA[key];
    const item = document.createElement('div');
    item.className = 'discovery-item';

    if (GameState.discoveries.includes(key)) {
      item.classList.add('unlocked');
      item.innerHTML = `
        <div style="font-size:28px;margin-bottom:4px;">💡</div>
        <div style="font-size:11px;color:#FFD54F;font-weight:bold;">${info.number}</div>
        <div style="font-size:10px;color:#E8DCC8;margin-top:2px;max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${info.name}</div>
      `;
      item.title = `${info.name}\n${info.desc}`;
      item.addEventListener('click', () => showDiscoveryDetail(key));
    } else {
      item.classList.add('locked');
      item.innerHTML = `
        <div style="font-size:28px;margin-bottom:4px;opacity:0.5;">❓</div>
        <div style="font-size:11px;color:#666;">?</div>
        <div style="font-size:9px;color:#555;margin-top:2px;">未知</div>
      `;
    }

    grid.appendChild(item);
  }

  const countEl = document.getElementById('discovery-count-display');
  if (countEl) countEl.textContent = `${GameState.discoveries.length}/${total}`;
}

function showDiscoveryDetail(index) {
  const detail = document.getElementById('discovery-detail');
  const discoveryInfo = getDiscoveryInfo(index);
  detail.innerHTML = `
    <h3>${discoveryInfo.name}</h3>
    <p>${discoveryInfo.desc}</p>
  `;
}

const DISCOVERY_DATA = {
  // 纪念品（12件）
  'shell_found': { number: 1, name: '贝壳记忆', desc: '海浪带走了很多东西，但有些会被送回来。' },
  'bookmark_found': { number: 2, name: '书香', desc: '书里夹着的，不只是书签，还有时光。' },
  'cup_found': { number: 3, name: '温暖', desc: '一杯热茶，是外婆给世界的温柔。' },
  'button_found': { number: 4, name: '纽扣', desc: '她的毛衣上少了一颗扣子，我的心里多了一份牵挂。' },
  'drawing_found': { number: 5, name: '涂鸦', desc: '小时候画的一家人，现在还在墙上。' },
  'sea_glass_found': { number: 6, name: '海玻璃', desc: '尖锐的棱角被海浪磨平，变成温柔的宝石。' },
  'flower_found': { number: 7, name: '干花', desc: '花谢了，但香气还在记忆里。' },
  'stamp_found': { number: 8, name: '邮票', desc: '一封没寄出去的信，藏着没说出口的话。' },
  'postcard_found': { number: 9, name: '明信片', desc: '心屿的灯塔，永远亮在心里。' },
  'windmill_found': { number: 10, name: '小风车', desc: '风一吹就转，童年也跟着转起来。' },
  'lighthouse_model_found': { number: 11, name: '灯塔模型', desc: '小小的灯塔，照亮大大的海。' },
  'key_found': { number: 12, name: '老钥匙', desc: '有些锁，需要时间才能打开。' },
  // 日记解锁（2个）
  'diary_sugar_paper': { number: 13, name: '糖纸', desc: '外婆留了这么多年的糖纸，是她的时光胶囊。' },
  'diary_doodle': { number: 14, name: '日记涂鸦', desc: '原来我小时候，就已经是她的全世界。' },
  // 对话解锁（9个）
  'fangjie_bread': { number: 15, name: '心形欧包', desc: '外婆教方姐的配方。揉面如待人。' },
  'fangjie_story': { number: 16, name: '外婆年轻的样子', desc: '在码头缝渔网，手巧，人也硬气。' },
  'chenbo_book': { number: 17, name: '无名书', desc: '书不怕旧，怕没人读。人也一样。' },
  'guanye_watch': { number: 18, name: '怀表里的照片', desc: '表不走了没关系，人还在走就行。' },
  'pangshu_note': { number: 19, name: '墙上的便签', desc: '外公在"把晚晚带大"旁边画了小人，写了个"算"。' },
  'waipo_album': { number: 20, name: '相册里的时光', desc: '灯塔下的合影。外婆说——你在哪，灯塔就在哪。' },
  'waipo_story': { number: 21, name: '外婆的故事', desc: '抱着你的时候，心就满了。满了就不怕了。' },
  'laozhou_light': { number: 22, name: '灯塔之光', desc: '灯塔照亮了海，也照亮了回家的路。' },
  'lighthouse_key': { number: 23, name: '灯塔钥匙', desc: '外婆给的钥匙，打开的不只是灯塔的门。' }
};

function getDiscoveryInfo(discoveryId) {
  if (discoveryId === null || discoveryId === undefined) {
    return DISCOVERY_DATA;
  }
  
  if (typeof discoveryId === 'number') {
    const keys = Object.keys(DISCOVERY_DATA);
    if (DISCOVERY_DATA[keys[discoveryId]]) {
      return DISCOVERY_DATA[keys[discoveryId]];
    }
  }
  
  return DISCOVERY_DATA[discoveryId] || { number: GameState.discoveries.indexOf(discoveryId) + 1, name: '小发现', desc: '这是一个新的小发现。' };
}

function showDiscoveryCard(discoveryId) {
  const card = document.getElementById('discovery-card');
  const info = getDiscoveryInfo(discoveryId);
  const total = getTotalDiscoveries();

  card.innerHTML = `
    <div class="discovery-icon">💡</div>
    <div class="discovery-number">${info.number}/${total}</div>
    <div class="discovery-name">${info.name}</div>
    <div class="discovery-desc">${info.desc}</div>
  `;
  
  card.classList.add('active');
  
  setTimeout(() => {
    card.classList.remove('active');
  }, 2500);
}

function toggleMusic() {
  GameState.flags.bgmEnabled = !GameState.flags.bgmEnabled;
}

function closeLetter() {
  document.getElementById('letter-panel').classList.remove('active');
}

function showLetter(text) {
  document.getElementById('letter-text').textContent = text;
  // 普通信件模式：隐藏翻页按钮
  const pageNav = document.getElementById('diary-prev-btn')?.parentElement;
  if (pageNav) pageNav.style.display = 'none';
  document.getElementById('letter-panel').classList.add('active');
}

function showEpilogue() {
  document.getElementById('ending-screen').classList.remove('active');
  document.getElementById('epilogue-screen').classList.add('active');
}

function restartGame() {
  localStorage.removeItem('xinyu_save');
  location.reload();
}

function updateEmotionUI() {
  const emotions = GameState.emotions;
  
  document.getElementById('emotion-anxious').textContent = emotions.anxious;
  document.querySelector('#bar-anxious .emotion-fill-inner').style.width = `${emotions.anxious}%`;
  
  document.getElementById('emotion-calm').textContent = emotions.calm;
  document.querySelector('#bar-calm .emotion-fill-inner').style.width = `${emotions.calm}%`;
  
  document.getElementById('emotion-brave').textContent = emotions.brave;
  document.querySelector('#bar-brave .emotion-fill-inner').style.width = `${emotions.brave}%`;
}

function updateDayUI() {
  document.getElementById('day-indicator').textContent = `第 ${GameState.day} 天`;
}

function getTotalDiscoveries() {
  // 以 DISCOVERY_DATA 为唯一真相源，确保总数准确且 HUD 与收集册一致
  return Object.keys(DISCOVERY_DATA).length;
}

function updateDiscoveryCount() {
  const collected = GameState.discoveries.length;
  const total = getTotalDiscoveries();
  const el = document.getElementById('discovery-count');
  if (el) el.textContent = `${collected}/${total}`;
}

function showTutorialTip(text) {
  const tip = document.getElementById('tutorial-tip');
  tip.textContent = text;
  tip.style.display = 'block';
  
  setTimeout(() => {
    tip.style.display = 'none';
  }, 3000);
}

function showHint(text, side = 'right') {
  const bubble = document.getElementById('hint-bubble');
  document.getElementById('hint-text').textContent = text;
  
  if (side === 'left') {
    bubble.classList.add('left');
  } else {
    bubble.classList.remove('left');
  }
  
  bubble.classList.add('show');
  
  setTimeout(() => {
    bubble.classList.remove('show');
  }, 4000);
}