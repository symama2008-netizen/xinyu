function drawBlock(x, y, w, h, color, hasShadow = false, pattern = '') {
  const ctx = gameCanvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  
  if (hasShadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(Math.floor(x) + 2, Math.floor(y) + 2, Math.floor(w), Math.floor(h));
  }
}

function drawPixelChar(x, y, skin, body, legs, hair, isPlayer = false, dir = 'down', animFrame = 0, npcType = null) {
  const ctx = gameCanvas.getContext('2d');
  const bs = CONFIG.BLOCK_SIZE;
  
  x = Math.floor(x);
  y = Math.floor(y);
  
  const t = Date.now() / 1000;
  
  let walkBob = 0;
  let idleBreathe = 0;
  let armSwing = 0;
  let legSwing = 0;
  let ponytailSwing = 0;
  
  if (isPlayer) {
    const isMoving = GameState.player?.isMoving;
    if (isMoving) {
      walkBob = Math.sin(animFrame * 0.3) * 0.5;
      armSwing = Math.sin(animFrame * 0.25) * 0.8;
      legSwing = Math.sin(animFrame * 0.25) * 0.8;
      ponytailSwing = Math.sin(animFrame * 0.3) * 1;
      
      if (GameState.player.isMoving) {
        GameState.player.animFrame = (GameState.player.animFrame || 0) + 0.15;
      }
    } else {
      idleBreathe = Math.sin(t * 0.002) * 0.5;
      ponytailSwing = Math.sin(t * 1.5) * 1;
    }
  } else if (npcType) {
    idleBreathe = Math.sin(t * 1.5 + (npcType.length * 0.5)) * 0.5;
  }
  
  const bodyY = y + bs * 0.35 + walkBob + idleBreathe;
  const legY = y + bs * 0.6 + walkBob + idleBreathe;
  const headY = y + bs * 0.15 + walkBob + idleBreathe;
  
  // 腿部（带走路动画）
  ctx.fillStyle = legs;
  ctx.fillRect(x + bs * 0.35 + legSwing, legY, bs * 0.12, bs * 0.4);
  ctx.fillRect(x + bs * 0.53 - legSwing, legY, bs * 0.12, bs * 0.4);
  
  // 身体
  ctx.fillStyle = body;
  ctx.fillRect(x + bs * 0.3, bodyY, bs * 0.4, bs * 0.35);
  
  // 手臂
  ctx.fillStyle = skin;
  if (isPlayer) {
    ctx.fillRect(x + bs * 0.22, bodyY + bs * 0.03 + armSwing, bs * 0.08, bs * 0.25);
    ctx.fillRect(x + bs * 0.70, bodyY + bs * 0.03 - armSwing, bs * 0.08, bs * 0.25);
  }
  
  // 脸
  ctx.fillStyle = skin;
  ctx.fillRect(x + bs * 0.35, headY, bs * 0.3, bs * 0.2);
  
  // 头发（主角：马尾辫）
  if (isPlayer) {
    ctx.fillStyle = hair;
    ctx.fillRect(x + bs * 0.3, headY - bs * 0.1, bs * 0.4, bs * 0.15);
    
    // 马尾
    const ponytailX = dir === 'left' ? x + bs * 0.72 : x + bs * 0.25;
    const ponytailY = headY - bs * 0.07;
    ctx.fillStyle = hair;
    ctx.fillRect(ponytailX + ponytailSwing, ponytailY, bs * 0.08, bs * 0.22);
    ctx.fillRect(ponytailX - 2 + ponytailSwing, ponytailY + bs * 0.17, bs * 0.12, bs * 0.08);
  } else {
    ctx.fillStyle = hair;
    ctx.fillRect(x + bs * 0.3, headY - bs * 0.1, bs * 0.4, bs * 0.15);
  }
  
  // 眼睛
  ctx.fillStyle = '#000';
  const blinkPhase = Math.sin(t * 0.5 + (npcType ? npcType.length : 0));
  const eyeHeight = blinkPhase > 0.95 ? 1 : bs * 0.04;
  ctx.beginPath();
  ctx.arc(x + bs * 0.42, headY + bs * 0.07, eyeHeight, 0, Math.PI * 2);
  ctx.arc(x + bs * 0.58, headY + bs * 0.07, eyeHeight, 0, Math.PI * 2);
  ctx.fill();
  
  // 腮红（主角）
  if (isPlayer) {
    ctx.fillStyle = 'rgba(255, 182, 193, 0.5)';
    ctx.fillRect(x + bs * 0.37, headY + bs * 0.1, bs * 0.06, bs * 0.03);
    ctx.fillRect(x + bs * 0.57, headY + bs * 0.1, bs * 0.06, bs * 0.03);
  }
}

function distance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function showItemPopup(text, x, y) {
  const popups = document.getElementById('item-popups');
  const popup = document.createElement('div');
  popup.className = 'item-popup';
  popup.textContent = text;
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
  popups.appendChild(popup);
  
  setTimeout(() => {
    popup.remove();
  }, 1200);
}

function loadJSON(url) {
  return fetch(url).then(response => response.json());
}