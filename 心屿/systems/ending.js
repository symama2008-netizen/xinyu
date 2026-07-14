// ==================== 结局系统 ====================
// 负责：结局条件判断、结局选择界面、结局画面绘制、通用尾声

let ENDING_DATA = null;
let CURRENT_ENDING_TYPE = null;
let EPILOGUE_LINE_INDEX = 0;
let EPILOGUE_TIMER = 0;

// ==================== 数据加载 ====================

async function loadEndingData() {
  if (ENDING_DATA) return ENDING_DATA;
  try {
    const response = await fetch('data/endings.json');
    ENDING_DATA = await response.json();
    return ENDING_DATA;
  } catch (e) {
    console.error('结局数据加载失败:', e);
    return null;
  }
}

// 页面初始化时即开始加载结局数据
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    loadEndingData();
  });
}

// ==================== 结局条件判断 ====================

function getAvailableEndings() {
  const total = (typeof getTotalDiscoveries === 'function') ? getTotalDiscoveries() : 20;
  const collected = GameState.discoveries.length;
  const brave = GameState.emotions.brave || 0;
  const calm = GameState.emotions.calm || 0;

  // 调试日志
  console.log('结局判定 - 勇气:', brave, '平静:', calm, '小发现:', collected, '/', total);

  const endings = {
    depart: {
      available: brave > calm,
      title: '再次出发',
      icon: '🧳',
      subtitle: 'A · 行李箱',
      reason: brave > calm ? null : `勇气值需要大于平静值（勇气 ${brave} / 平静 ${calm}）`
    },
    stay: {
      available: calm >= brave,
      title: '暂时停留',
      icon: '🧣',
      subtitle: 'B · 围裙',
      reason: calm >= brave ? null : `平静值需要大于或等于勇气值（平静 ${calm} / 勇气 ${brave}）`
    },
    write: {
      available: collected >= total && total > 0,
      title: '找到答案',
      icon: '📖',
      subtitle: 'C · 日记本',
      reason: collected >= total ? null : `需要收集全部小发现（${collected}/${total}）`
    }
  };

  console.log('可选结局:', Object.keys(endings).filter(k => endings[k].available));

  return endings;
}

// ==================== 结局选择界面 ====================

function showEndingChoices() {
  if (!ENDING_DATA) {
    loadEndingData().then(() => showEndingChoices());
    return;
  }

  // 关闭对话面板
  if (typeof endDialogue === 'function' && GameState.currentDialogue) {
    endDialogue();
  }

  const endings = getAvailableEndings();
  const screen = document.getElementById('ending-choice-screen');
  if (!screen) {
    console.error('未找到 #ending-choice-screen');
    return;
  }
  const container = document.getElementById('ending-choices');
  if (!container) {
    console.error('未找到 #ending-choices 容器');
    return;
  }
  container.innerHTML = '';

  const endingKeys = ['depart', 'stay', 'write'];
  for (const key of endingKeys) {
    const ending = endings[key];
    const card = document.createElement('div');
    card.className = 'ending-choice-card' + (ending.available ? '' : ' locked');

    card.innerHTML = `
      <div class="ending-choice-icon">${ending.icon}</div>
      <div class="ending-choice-title">${ending.title}</div>
      <div class="ending-choice-subtitle">${ending.subtitle}</div>
      <div class="ending-choice-reason">${ending.available ? '✓ 可选择' : '✗ ' + ending.reason}</div>
    `;

    if (ending.available) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        CURRENT_ENDING_TYPE = key;
        GameState.flags.ending = key;
        saveGame();
        showEnding(key);
      });
    }

    container.appendChild(card);
  }

  screen.classList.add('active');
  const hintEl = document.getElementById('ending-choice-hint');
  if (hintEl && typeof getTotalDiscoveries === 'function') {
    hintEl.textContent =
      '你已集齐 ' + GameState.discoveries.length + ' / ' + getTotalDiscoveries() + ' 个小发现';
  }
}

// ==================== 结局画面 ====================

function showEnding(endingType) {
  if (!ENDING_DATA) {
    loadEndingData().then(() => showEnding(endingType));
    return;
  }

  CURRENT_ENDING_TYPE = endingType;
  const ending = ENDING_DATA[endingType];
  if (!ending) {
    console.error('结局数据不存在:', endingType);
    return;
  }

  // 隐藏选择界面
  document.getElementById('ending-choice-screen').classList.remove('active');

  // 渲染结局画面
  const titleEl = document.getElementById('ending-title');
  const textEl = document.getElementById('ending-text');

  if (titleEl) titleEl.textContent = ending.icon + '  ' + ending.title;
  if (textEl) {
    textEl.innerHTML = `
      <div class="ending-transition">${ending.transition}</div>
      <div class="ending-body">${formatEndingText(ending.text)}</div>
    `;
  }

  // 在背景 canvas 上绘制像素场景
  drawEndingScene(endingType);

  // 显示结局画面
  document.getElementById('ending-screen').classList.add('active');
  // 停止游戏循环
  if (typeof gameRunning !== 'undefined') gameRunning = false;

  // 标记结局
  GameState.flags.ending = endingType;
  if (endingType === 'depart') GameState.flags.endingReturn = true;
  if (endingType === 'stay') GameState.flags.endingStay = true;
  if (endingType === 'write') {
    GameState.flags.endingStayEvening = true;
    GameState.flags.endingDiaryWriting = true;
  }
  saveGame();
}

function formatEndingText(text) {
  // 段落分隔：双换行
  return text.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

function drawEndingScene(endingType) {
  let canvas = document.getElementById('ending-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'ending-canvas';
    const screen = document.getElementById('ending-screen');
    if (screen) {
      screen.insertBefore(canvas, screen.firstChild);
    }
  }
  
  const designW = 1280;
  const designH = 720;
  canvas.width = designW;
  canvas.height = designH;
  
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, designW, designH);

  const grad = ctx.createLinearGradient(0, 0, 0, designH);
  if (endingType === 'depart') {
    grad.addColorStop(0, '#FFB6C1');
    grad.addColorStop(0.5, '#FFD54F');
    grad.addColorStop(1, '#87CEEB');
  } else if (endingType === 'stay') {
    grad.addColorStop(0, '#FFE4B5');
    grad.addColorStop(1, '#DEB887');
  } else {
    grad.addColorStop(0, '#1a1a3e');
    grad.addColorStop(1, '#2c3e6b');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, designW, designH);

  const horizonY = designH * 0.67;
  ctx.fillStyle = endingType === 'write' ? '#0f1a3a' : '#90EE90';
  ctx.fillRect(0, horizonY, designW, designH - horizonY);
  ctx.fillStyle = endingType === 'write' ? '#1f2a4a' : '#7CCD7C';
  const mountainCount = Math.ceil(designW / 180) + 1;
  for (let i = 0; i < mountainCount; i++) {
    const x = i * 180;
    const h = 40 + (i % 3) * 20;
    ctx.beginPath();
    ctx.moveTo(x, horizonY);
    ctx.lineTo(x + 90, horizonY - h);
    ctx.lineTo(x + 180, horizonY);
    ctx.closePath();
    ctx.fill();
  }

  const lighthouseX = designW * 0.84;
  const lighthouseY = designH * 0.39;
  drawLighthouse(ctx, lighthouseX, lighthouseY, endingType);

  drawOldHouse(ctx, 80, horizonY - 60, endingType);

  if (endingType === 'depart') {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(designW * 0.31, horizonY + 40, 480, 20);
    ctx.fillStyle = '#5D4037';
    for (let i = 0; i < 24; i++) {
      ctx.fillRect(designW * 0.31 + i * 20, horizonY + 60, 4, 30);
    }
    drawSuitcase(ctx, designW * 0.45, horizonY);
    drawPixelCharacter(ctx, designW * 0.17, horizonY + 40, 'old', 'wave');
  } else if (endingType === 'stay') {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(200, horizonY, 200, 60);
    ctx.fillStyle = '#D2691E';
    ctx.fillRect(200, horizonY, 200, 8);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = '#E8A87C';
      ctx.beginPath();
      ctx.ellipse(230 + i * 30, horizonY - 10, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    drawPixelCharacter(ctx, designW * 0.47, horizonY + 40, 'young', 'idle');
  } else {
    drawWritingDesk(ctx, designW * 0.42, horizonY);
  }
}

function drawLighthouse(ctx, x, y, endingType) {
  ctx.fillStyle = '#ECEFF1';
  ctx.fillRect(x, y, 60, 200);
  ctx.fillStyle = '#C62828';
  ctx.fillRect(x, y + 40, 60, 12);
  ctx.fillRect(x, y + 80, 60, 12);
  ctx.fillRect(x, y + 120, 60, 12);
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(x + 10, y - 30, 40, 30);
}

function drawOldHouse(ctx, x, y, endingType) {
  // 墙
  ctx.fillStyle = '#C49A6C';
  ctx.fillRect(x, y, 160, 80);
  // 屋顶
  ctx.fillStyle = '#5D4037';
  ctx.beginPath();
  ctx.moveTo(x - 8, y);
  ctx.lineTo(x + 80, y - 36);
  ctx.lineTo(x + 168, y);
  ctx.closePath();
  ctx.fill();
  // 门
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(x + 70, y + 30, 24, 50);
  // 窗户
  ctx.fillStyle = endingType === 'write' ? '#FFD54F' : '#87CEEB';
  ctx.fillRect(x + 12, y + 16, 24, 24);
  ctx.fillRect(x + 124, y + 16, 24, 24);
  ctx.strokeStyle = '#3E2723';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 12, y + 16, 24, 24);
  ctx.strokeRect(x + 124, y + 16, 24, 24);
  // 烟囱烟
  if (endingType !== 'write') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x + 130, y - 30 - i * 14, 6 + i * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawSuitcase(ctx, x, y) {
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(x, y, 50, 36);
  ctx.fillStyle = '#FFD54F';
  ctx.fillRect(x + 22, y + 12, 6, 12);
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x, y - 4, 50, 4);
}

function drawPixelCharacter(ctx, x, y, type, action) {
  // 简化像素小人
  const skin = type === 'old' ? '#FDE8D4' : '#FCE4B8';
  const cloth = type === 'old' ? '#6B6B6B' : '#F2A6B5';
  // 头
  ctx.fillStyle = skin;
  ctx.fillRect(x + 8, y, 16, 16);
  // 头发
  ctx.fillStyle = type === 'old' ? '#E8E8E8' : '#5C3A28';
  ctx.fillRect(x + 6, y - 2, 20, 6);
  // 身体
  ctx.fillStyle = cloth;
  ctx.fillRect(x + 6, y + 16, 20, 22);
  // 挥手
  if (action === 'wave') {
    ctx.fillStyle = skin;
    ctx.fillRect(x + 26, y + 4, 4, 10);
  }
}

function drawWritingDesk(ctx, x, y) {
  // 桌面
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(x, y, 200, 16);
  // 桌腿
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(x + 8, y + 16, 8, 50);
  ctx.fillRect(x + 184, y + 16, 8, 50);
  // 台灯
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(x + 20, y - 20, 30, 20);
  ctx.fillStyle = '#FFA000';
  ctx.fillRect(x + 30, y, 10, 8);
  // 日记本
  ctx.fillStyle = '#FFF8DC';
  ctx.fillRect(x + 80, y - 8, 60, 14);
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x + 80, y - 8, 4, 14);
  // 笔
  ctx.fillStyle = '#1976D2';
  ctx.fillRect(x + 150, y - 4, 30, 3);
}

// ==================== 通用尾声 ====================

function showEpilogue() {
  if (!ENDING_DATA) {
    loadEndingData().then(() => showEpilogue());
    return;
  }

  document.getElementById('ending-screen').classList.remove('active');
  document.getElementById('epilogue-screen').classList.add('active');

  EPILOGUE_LINE_INDEX = 0;
  EPILOGUE_TIMER = 0;

  // 根据结局类型绘制不同画面
  drawEpilogueScene();

  // 启动字幕打字机
  typeEpilogueText();
}

function drawEpilogueScene() {
  let canvas = document.getElementById('epilogue-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'epilogue-canvas';
    const screen = document.getElementById('epilogue-screen');
    if (screen) {
      screen.insertBefore(canvas, screen.firstChild);
    }
  }
  
  const designW = 1280;
  const designH = 720;
  canvas.width = designW;
  canvas.height = designH;
  
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, designW, designH);

  const endingType = CURRENT_ENDING_TYPE || 'depart';

  if (endingType === 'depart') {
    drawDepartEpilogue(ctx, designW, designH);
  } else if (endingType === 'stay') {
    drawStayEpilogue(ctx, designW, designH);
  } else if (endingType === 'write') {
    drawWriteEpilogue(ctx, designW, designH);
  } else {
    drawDepartEpilogue(ctx, designW, designH);
  }
}

function drawDepartEpilogue(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#FFB6C1');
  grad.addColorStop(0.5, '#FFE4E1');
  grad.addColorStop(1, '#87CEEB');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#FFA000';
  ctx.beginPath();
  ctx.arc(1000, 150, 50, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5D4E37';
  ctx.fillRect(200, 500, 300, 80);

  ctx.fillStyle = '#3A3A3A';
  ctx.fillRect(150, 350, 150, 200);
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(160, 360, 130, 160);

  ctx.fillStyle = '#FFF';
  ctx.font = '12px sans-serif';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(170, 380 + i * 35, 110, 3);
  }

  ctx.fillStyle = '#8B4513';
  ctx.fillRect(450, 520, 80, 60);
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(475, 545, 30, 5);

  drawPixelCharacter(ctx, 350, 480, 'young', 'idle');

  ctx.fillStyle = '#8B4513';
  ctx.fillRect(0, 600, w, 30);
  ctx.fillStyle = '#FFD54F';
  for (let i = 0; i < 20; i++) {
    ctx.fillRect(i * 70 + 10, 610, 40, 4);
  }

  drawLighthouse(ctx, 1100, 280, 'epilogue');
}

function drawStayEpilogue(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#FFE4B5');
  grad.addColorStop(0.5, '#FFDAB9');
  grad.addColorStop(1, '#DEB887');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#FFA000';
  ctx.beginPath();
  ctx.arc(640, 120, 45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#E8966B';
  ctx.fillRect(400, 350, 480, 320);
  
  ctx.fillStyle = '#C0503C';
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 8; j++) {
      ctx.fillRect(410 + j * 60, 360 + i * 50, 56, 46);
    }
  }

  ctx.fillStyle = 'rgba(200,220,255,0.7)';
  ctx.fillRect(450, 400, 200, 180);

  ctx.fillStyle = '#8B6914';
  ctx.beginPath();
  ctx.moveTo(500, 550);
  ctx.quadraticCurveTo(480, 500, 500, 450);
  ctx.quadraticCurveTo(520, 500, 500, 550);
  ctx.fill();

  ctx.fillStyle = '#F4E4BA';
  ctx.fillRect(580, 470, 60, 50);

  ctx.fillStyle = '#5D4037';
  ctx.fillRect(500, 600, 80, 70);

  drawPixelCharacter(ctx, 650, 550, 'young', 'idle');

  ctx.fillStyle = '#CD5C5C';
  ctx.fillRect(800, 250, 40, 80);
  
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(820, 230 - i * 15, 4 + i, 0, Math.PI * 2);
    ctx.fill();
  }

  drawOldHouse(ctx, 100, 400, 'epilogue');
}

function drawWriteEpilogue(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1a1a3e');
  grad.addColorStop(0.5, '#2c3e6b');
  grad.addColorStop(1, '#4a6fa5');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h * 0.5, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#7A7A7A';
  ctx.fillRect(200, 300, 280, 380);
  
  ctx.fillStyle = '#6A6A6A';
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 4; j++) {
      ctx.fillRect(210 + j * 70, 310 + i * 70, 60, 60);
    }
  }

  ctx.fillStyle = '#FFD700';
  ctx.fillRect(550, 250, 120, 80);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(560, 260, 100, 60);

  ctx.fillStyle = '#5D4037';
  ctx.fillRect(500, 400, 240, 20);
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(520, 420, 10, 80);
  ctx.fillRect(720, 420, 10, 80);

  ctx.fillStyle = '#FFF8DC';
  ctx.fillRect(560, 420, 140, 100);
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(560, 420, 6, 100);

  ctx.fillStyle = '#1976D2';
  ctx.fillRect(710, 450, 25, 3);

  ctx.fillStyle = '#FFD54F';
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(620, 390, 100, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  drawPixelCharacter(ctx, 580, 550, 'young', 'idle');

  ctx.fillStyle = '#8B4513';
  ctx.fillRect(520, 600, 60, 30);

  drawOldHouse(ctx, 1000, 420, 'epilogue');
}

function drawDefaultEpilogue(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#FFE4B5');
  grad.addColorStop(0.4, '#FFD700');
  grad.addColorStop(1, '#87CEEB');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#FFA000';
  ctx.beginPath();
  ctx.arc(640, 200, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFD54F';
  ctx.beginPath();
  ctx.arc(640, 200, 50, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4FC3F7';
  ctx.fillRect(0, 480, w, 240);
  ctx.fillStyle = '#FFD54F';
  for (let i = 0; i < 30; i++) {
    const y = 490 + (i % 5) * 4;
    const x = i * 50;
    ctx.fillRect(x, y, 20, 1);
  }

  ctx.fillStyle = '#9CCC65';
  for (let i = 0; i < 10; i++) {
    const x = i * 140;
    ctx.beginPath();
    ctx.moveTo(x, 480);
    ctx.lineTo(x + 70, 420);
    ctx.lineTo(x + 140, 480);
    ctx.closePath();
    ctx.fill();
  }

  drawLighthouse(ctx, 1100, 260, 'epilogue');
  drawOldHouse(ctx, 100, 420, 'epilogue');

  drawPixelCharacter(ctx, 280, 460, 'old', 'idle');
  drawPixelCharacter(ctx, 340, 460, 'old', 'idle');
  drawPixelCharacter(ctx, 420, 460, 'young', 'idle');
  drawPixelCharacter(ctx, 500, 460, 'old', 'idle');
}

function typeEpilogueText() {
  if (!ENDING_DATA) return;

  const textEl = document.getElementById('epilogue-text');
  if (!textEl) return;

  const endingType = CURRENT_ENDING_TYPE || 'depart';
  const ending = ENDING_DATA[endingType];
  const epilogue = ending && ending.epilogue;

  if (!epilogue) return;

  const bodyHtml = `<p>${epilogue.text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
  const linesHtml = epilogue.finalLines.map((line, i) =>
    `<div class="epilogue-final-line" id="epilogue-line-${i}"></div>`
  ).join('');

  textEl.innerHTML = bodyHtml + '<div class="epilogue-final-lines">' + linesHtml + '</div>';

  typeNextEpilogueLine();
}

function typeNextEpilogueLine() {
  if (!ENDING_DATA) return;
  const endingType = CURRENT_ENDING_TYPE || 'depart';
  const ending = ENDING_DATA[endingType];
  const epilogue = ending && ending.epilogue;
  if (!epilogue) return;
  const lines = epilogue.finalLines;
  if (EPILOGUE_LINE_INDEX >= lines.length) {
    // 全部打完，显示重新开始按钮
    setTimeout(() => {
      const btn = document.getElementById('epilogue-restart-btn');
      if (btn) btn.style.display = 'inline-block';
    }, 1000);
    return;
  }

  const lineEl = document.getElementById('epilogue-line-' + EPILOGUE_LINE_INDEX);
  if (!lineEl) return;

  const fullText = lines[EPILOGUE_LINE_INDEX];
  let charIndex = 0;

  function typeChar() {
    if (charIndex < fullText.length) {
      lineEl.textContent = fullText.substring(0, charIndex + 1);
      charIndex++;
      setTimeout(typeChar, 50);
    } else {
      EPILOGUE_LINE_INDEX++;
      setTimeout(typeNextEpilogueLine, 1200);
    }
  }
  typeChar();
}

// ==================== 重新开始 ====================

function restartGame() {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.warn('清除存储失败:', e);
  }
  try {
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const name = c.indexOf('=') >= 0 ? c.split('=')[0].trim() : c.trim();
      if (!name) continue;
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=' + window.location.pathname + ';';
    }
  } catch (e) {
    console.warn('清除 cookie 失败:', e);
  }
  // 强制从服务器重新加载页面，绕过浏览器缓存
  const url = new URL(window.location.href);
  url.searchParams.set('_r', Date.now().toString());
  window.location.replace(url.toString());
}

// 暴露到全局
if (typeof window !== 'undefined') {
  window.getAvailableEndings = getAvailableEndings;
  window.showEndingChoices = showEndingChoices;
  window.showEnding = showEnding;
  window.showEpilogue = showEpilogue;
  window.restartGame = restartGame;
  window.loadEndingData = loadEndingData;
}
