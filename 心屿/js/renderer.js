let ctx;
let MAP_DATA = null;
let INTERIOR_DATA = {};

// ==================== 性能相关缓存变量 ====================

let _frameCount = 0;
let _lastFpsTime = 0;
let _currentFps = 60;
let _skipAnimations = false;

let _cachedBuildingScreenCoords = null;
let _cachedCameraX = -1;
let _cachedCameraY = -1;

let _cachedDecorationScreenCoords = null;

async function loadMapData() {
  const response = await fetch('data/maps/outdoor.json');
  MAP_DATA = await response.json();
}

async function loadInteriorData(sceneId) {
  if (!INTERIOR_DATA[sceneId]) {
    const response = await fetch(`data/interiors/${sceneId}.json`);
    INTERIOR_DATA[sceneId] = await response.json();
  }
  return INTERIOR_DATA[sceneId];
}

function initRenderer(canvas) {
  gameCanvas = canvas;
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
}

function render() {
  _frameCount++;

  const now = performance.now();
  if (now - _lastFpsTime >= 500) {
    _currentFps = Math.round(_frameCount * 1000 / (now - _lastFpsTime));
    _frameCount = 0;
    _lastFpsTime = now;
    _skipAnimations = _currentFps < 35;
  }

  ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

  if (GameState.location === 'outdoor') {
    renderOutdoor();
  } else {
    renderIndoor(GameState.location);
  }
}

// ==================== 室外渲染 ====================

function renderOutdoor() {
  renderSky();
  renderMap();
  renderDecorations();
  renderBuildings();
  renderOutdoorItems();
  renderEntities();
  renderInteractionPrompt();
  renderOverlays();
}

function renderSky() {
  const emotion = GameState.emotions;
  let skyColor = CONFIG.COLORS.sky.calm;

  if (emotion.anxious > emotion.calm && emotion.anxious > emotion.brave) {
    skyColor = CONFIG.COLORS.sky.anxious;
  } else if (emotion.brave > emotion.calm && emotion.brave > emotion.anxious) {
    skyColor = CONFIG.COLORS.sky.brave;
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_HEIGHT);
  gradient.addColorStop(0, skyColor);
  gradient.addColorStop(1, '#87CEEB');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
}

function renderMap() {
  if (!MAP_DATA) return;

  const bs = CONFIG.BLOCK_SIZE;
  const mapW = MAP_DATA.width;
  const mapH = MAP_DATA.height;
  const camX = GameState.camera.x;
  const camY = GameState.camera.y;

  const startX = Math.max(0, Math.floor(camX / bs));
  const endX = Math.min(startX + Math.ceil(CONFIG.CANVAS_WIDTH / bs) + 1, mapW);
  const startY = Math.max(0, Math.floor(camY / bs));
  const endY = Math.min(startY + Math.ceil(CONFIG.CANVAS_HEIGHT / bs) + 1, mapH);

  const animateWater = !_skipAnimations && (_frameCount % 3 === 0);
  const time = animateWater ? performance.now() * 0.001 : 0;

  for (let y = startY; y < endY; y++) {
    const row = MAP_DATA.terrain[y];
    if (!row) continue;

    const screenY = Math.floor(y * bs - camY);
    const rowStartX = Math.floor(startX * bs - camX);

    for (let x = startX; x < endX; x++) {
      const tile = row[x];
      if (!tile) continue;

      const screenX = rowStartX + (x - startX) * bs;

      switch (tile) {
        case 'w':
          renderWaterTile(screenX, screenY, bs, x, y, time, animateWater);
          break;
        case 'r':
          renderRoadTile(screenX, screenY, bs);
          break;
        case 'h':
          renderHillTile(screenX, screenY, bs);
          break;
        case 'g':
        default:
          renderGrassTile(screenX, screenY, bs, x, y);
          break;
      }
    }
  }
}

function renderWaterTile(x, y, bs, gridX, gridY, time, animate) {
  ctx.fillStyle = '#4169E1';
  ctx.fillRect(x, y, bs, bs);

  if (animate) {
    const waveOffset = Math.sin(time * 2 + gridX * 0.5 + gridY * 0.3) * 2;
    ctx.fillStyle = '#5B7FE8';
    ctx.fillRect(x + 2, y + Math.floor(bs * 0.3 + waveOffset), bs - 4, 2);
    ctx.fillRect(x + 4, y + Math.floor(bs * 0.6 - waveOffset), bs - 8, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x + 6, y + Math.floor(bs * 0.4 + waveOffset), 4, 1);
  } else {
    ctx.fillStyle = '#5B7FE8';
    ctx.fillRect(x + 2, y + Math.floor(bs * 0.3), bs - 4, 2);
    ctx.fillRect(x + 4, y + Math.floor(bs * 0.6), bs - 8, 2);
  }
}

function renderRoadTile(x, y, bs) {
  ctx.fillStyle = '#C0C0C0';
  ctx.fillRect(x, y, bs, bs);
  ctx.fillStyle = '#A8A8A8';
  ctx.fillRect(x + 6, y + 4, 3, 3);
  ctx.fillRect(x + bs - 10, y + bs - 8, 3, 3);
  ctx.fillRect(x + 10, y + bs - 6, 2, 2);
}

function renderHillTile(x, y, bs) {
  ctx.fillStyle = '#556B2F';
  ctx.fillRect(x, y, bs, bs);
  ctx.fillStyle = '#6B8E23';
  ctx.fillRect(x + 4, y + 6, 4, 3);
  ctx.fillRect(x + bs - 10, y + 10, 5, 4);
  ctx.fillRect(x + 12, y + bs - 8, 3, 3);
  ctx.fillStyle = '#808080';
  ctx.fillRect(x + 8, y + bs - 6, 4, 3);
}

function renderGrassTile(x, y, bs, gridX, gridY) {
  ctx.fillStyle = '#90EE90';
  ctx.fillRect(x, y, bs, bs);

  const seed = (gridX * 73 + gridY * 37) % 100;

  if (seed < 15) {
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x + 8, y + 10, 3, 3);
  } else if (seed < 25) {
    ctx.fillStyle = '#FFF8DC';
    ctx.fillRect(x + 18, y + 16, 3, 3);
  } else if (seed < 32) {
    ctx.fillStyle = '#FFB6C1';
    ctx.fillRect(x + 12, y + 20, 3, 3);
  }

  if (seed % 3 === 0) {
    ctx.fillStyle = '#7CCD7C';
    ctx.fillRect(x + 6, y + 6, 2, 2);
    ctx.fillRect(x + bs - 8, y + 14, 2, 2);
  }
}

// ==================== 建筑渲染（带缓存） ====================

function renderBuildings() {
  if (!MAP_DATA) return;

  const bs = CONFIG.BLOCK_SIZE;
  const camX = GameState.camera.x;
  const camY = GameState.camera.y;

  let screenBuildings;
  if (_cachedBuildingScreenCoords && _cachedCameraX === camX && _cachedCameraY === camY) {
    screenBuildings = _cachedBuildingScreenCoords;
  } else {
    screenBuildings = MAP_DATA.buildings.map(b => ({
      ...b,
      screenX: b.x * bs - camX,
      screenY: b.y * bs - camY,
      bottomY: (b.y + b.h) * bs - camY
    }));
    screenBuildings.sort((a, b) => a.bottomY - b.bottomY);
    _cachedBuildingScreenCoords = screenBuildings;
    _cachedCameraX = camX;
    _cachedCameraY = camY;
  }

  const cw = CONFIG.CANVAS_WIDTH;
  const ch = CONFIG.CANVAS_HEIGHT;

  for (let i = 0; i < screenBuildings.length; i++) {
    const b = screenBuildings[i];
    const bw = b.w * bs;
    const bh = b.h * bs;
    if (b.screenX + bw < 0 || b.screenX > cw) continue;
    if (b.screenY + bh < 0 || b.screenY > ch) continue;
    renderBuilding(b);
  }
}

function renderBuilding(b) {
  const bs = CONFIG.BLOCK_SIZE;
  const x = Math.floor(b.screenX);
  const y = Math.floor(b.screenY);
  const w = b.w * bs;
  const h = b.h * bs;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h + bs * 0.3, w * 0.6, bs * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (b.id) {
    case 'oldhouse':
      renderOldHouse(x, y, w, h, bs);
      break;
    case 'bakery':
      renderBakery(x, y, w, h, bs);
      break;
    case 'bookstore':
      renderBookstore(x, y, w, h, bs);
      break;
    case 'lighthouse':
      renderLighthouse(x, y, w, h, bs);
      break;
    case 'diner':
      renderDiner(x, y, w, h, bs);
      break;
    case 'repairshop':
      renderRepairshop(x, y, w, h, bs);
      break;
    default:
      renderGenericBuilding(x, y, w, h, bs);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x + w / 2 - b.name.length * 6, y - 22, b.name.length * 12 + 8, 16);
  ctx.fillStyle = '#FFD54F';
  ctx.font = 'bold 11px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(b.name, x + w / 2, y - 10);
  ctx.textAlign = 'left';
}

function renderGenericBuilding(x, y, w, h, bs) {
  ctx.fillStyle = '#8B7355';
  ctx.fillRect(x, y, w, h);
  
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#7B6345';
    ctx.fillRect(x, y + i * (h / 5), w, 2);
  }

  ctx.fillStyle = '#5D4037';
  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.lineTo(x + w / 2, y - h * 0.4);
  ctx.lineTo(x + w + 4, y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#8B5A2B';
  for (let i = 0; i < 2; i++) {
    const winX = x + bs * 0.3 + i * (w - bs * 0.6);
    const winY = y + h * 0.35;
    ctx.fillRect(winX, winY, bs * 0.4, bs * 0.4);
    ctx.fillStyle = 'rgba(255,248,220,0.7)';
    ctx.fillRect(winX + 4, winY + 4, bs * 0.4 - 8, bs * 0.4 - 8);
    ctx.fillStyle = '#8B5A2B';
    ctx.beginPath();
    ctx.moveTo(winX + bs * 0.2, winY);
    ctx.lineTo(winX + bs * 0.2, winY + bs * 0.4);
    ctx.moveTo(winX, winY + bs * 0.2);
    ctx.lineTo(winX + bs * 0.4, winY + bs * 0.2);
    ctx.stroke();
  }

  ctx.fillStyle = '#DEB887';
  ctx.fillRect(x + w / 2 - bs * 0.25, y + h - bs * 0.9, bs * 0.5, bs * 0.9);
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h - bs * 0.6, 4, 0, Math.PI * 2);
  ctx.fill();
}

function renderOldHouse(x, y, w, h, bs) {
  for (let i = 0; i < w; i += bs) {
    for (let j = 0; j < h; j += bs) {
      const shade = (Math.floor(i / bs) + Math.floor(j / bs)) % 2 === 0 ? '#C49A6C' : '#B8896A';
      ctx.fillStyle = shade;
      ctx.fillRect(x + i, y + j, bs, bs);
    }
  }

  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.lineTo(x + w / 2, y - bs * 1.5);
  ctx.lineTo(x + w + 4, y);
  ctx.closePath();
  ctx.fill();

  const windows = [bs * 0.8, w - bs * 2];
  windows.forEach(wx => {
    const winX = x + wx;
    const winY = y + bs;

    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(winX - 2, winY - 2, bs + 4, bs + 4);
    ctx.fillStyle = 'rgba(255,248,220,0.7)';
    ctx.fillRect(winX, winY, bs, bs);

    ctx.fillStyle = '#8B5A2B';
    ctx.beginPath();
    ctx.moveTo(winX + bs / 2, winY);
    ctx.lineTo(winX + bs / 2, winY + bs);
    ctx.moveTo(winX, winY + bs / 2);
    ctx.lineTo(winX + bs, winY + bs / 2);
    ctx.stroke();

    ctx.fillStyle = '#6B8E4E';
    ctx.fillRect(winX + bs * 0.1, winY + bs * 0.7, bs * 0.3, bs * 0.25);
  });

  const doorX = x + w / 2 - bs / 2 - 4;
  const doorY = y + h - bs * 1.5;
  ctx.fillStyle = '#DEB887';
  ctx.fillRect(doorX, doorY, bs, bs * 1.5);

  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(doorX + bs * 0.7, doorY + bs * 0.75, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#6B4226';
  const marks = [0.2, 0.4, 0.6, 0.8];
  marks.forEach((m, i) => {
    ctx.fillRect(doorX - 8, doorY + bs * 1.5 * m, 6, 1);
  });

  ctx.fillStyle = '#A09080';
  ctx.fillRect(x - bs * 0.5, y + h, w + bs, bs * 0.5);
}

function renderBakery(x, y, w, h, bs) {
  for (let i = 0; i < w; i += bs) {
    for (let j = 0; j < h; j += bs) {
      const shade = (Math.floor(i / bs) + Math.floor(j / bs)) % 2 === 0 ? '#E8966B' : '#D88060';
      ctx.fillStyle = shade;
      ctx.fillRect(x + i, y + j, bs, bs);
    }
  }

  const showcaseX = x + bs * 0.3;
  const showcaseY = y + bs * 0.8;
  const showcaseW = w - bs * 0.6;
  const showcaseH = bs * 1.8;

  ctx.fillStyle = '#8B5A2B';
  ctx.fillRect(showcaseX - 2, showcaseY - 2, showcaseW + 4, showcaseH + 4);
  ctx.fillStyle = 'rgba(200,220,255,0.6)';
  ctx.fillRect(showcaseX, showcaseY, showcaseW, showcaseH);

  ctx.fillStyle = '#8B5A2B';
  ctx.beginPath();
  ctx.moveTo(showcaseX + showcaseW / 2, showcaseY);
  ctx.lineTo(showcaseX + showcaseW / 2, showcaseY + showcaseH);
  ctx.moveTo(showcaseX, showcaseY + showcaseH / 2);
  ctx.lineTo(showcaseX + showcaseW, showcaseY + showcaseH / 2);
  ctx.stroke();

  const breadTypes = [
    { color: '#F4B85E', shape: 'croissant' },
    { color: '#DEB887', shape: 'bread' },
    { color: '#F5DEB3', shape: 'round' },
    { color: '#FFD700', shape: 'heart' }
  ];

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const bx = showcaseX + 10 + col * (showcaseW - 20) / 3;
      const by = showcaseY + 10 + row * (showcaseH - 20) / 2;
      const type = breadTypes[(row * 3 + col) % breadTypes.length];

      ctx.fillStyle = type.color;
      if (type.shape === 'croissant') {
        ctx.beginPath();
        ctx.ellipse(bx + 12, by + 6, 12, 6, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (type.shape === 'round') {
        ctx.beginPath();
        ctx.arc(bx + 10, by + 6, 9, 0, Math.PI * 2);
        ctx.fill();
      } else if (type.shape === 'heart') {
        ctx.fillRect(bx + 4, by + 4, 6, 6);
        ctx.fillRect(bx + 10, by + 4, 6, 6);
        ctx.fillRect(bx + 2, by + 6, 16, 4);
        ctx.fillRect(bx + 5, by + 10, 10, 3);
      } else {
        ctx.fillRect(bx + 2, by + 2, 16, 10);
      }
    }
  }

  const doorX = x + w - bs * 1.3;
  const doorY = y + h - bs * 1.5;
  ctx.fillStyle = '#8B5A3C';
  ctx.fillRect(doorX, doorY, bs * 0.9, bs * 1.5);

  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(doorX + bs * 0.7, doorY + bs * 0.8, 3, 0, Math.PI * 2);
  ctx.fill();
}

function renderBookstore(x, y, w, h, bs) {
  for (let i = 0; i < w; i += bs) {
    for (let j = 0; j < h; j += bs) {
      const shade = (Math.floor(i / bs) + Math.floor(j / bs)) % 2 === 0 ? '#7A7A7A' : '#6A6A6A';
      ctx.fillStyle = shade;
      ctx.fillRect(x + i, y + j, bs, bs);
    }
  }

  const winX = x + bs * 0.4;
  const winY = y + bs * 0.8;
  const winW = w - bs * 0.8;
  const winH = bs * 1.8;

  ctx.fillStyle = '#2F4F2F';
  ctx.fillRect(winX - 2, winY - 2, winW + 4, winH + 4);
  ctx.fillStyle = 'rgba(255,248,220,0.6)';
  ctx.fillRect(winX, winY, winW, winH);

  ctx.fillStyle = '#2F4F2F';
  ctx.beginPath();
  ctx.moveTo(winX + winW / 2, winY);
  ctx.lineTo(winX + winW / 2, winY + winH);
  ctx.moveTo(winX, winY + winH / 2);
  ctx.lineTo(winX + winW, winY + winH / 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(139,69,19,0.5)';
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 2; col++) {
      const sx = winX + 8 + col * (winW / 2 - 12);
      const sy = winY + 10 + row * (winH - 20) / 5;
      ctx.fillRect(sx, sy, (winW / 2 - 16), (winH - 30) / 6);
    }
  }

  const doorX = x + w / 2 - bs / 2;
  const doorY = y + h - bs * 1.5;
  ctx.fillStyle = '#5D3A1A';
  ctx.fillRect(doorX, doorY, bs, bs * 1.5);

  ctx.fillStyle = '#B8860B';
  ctx.fillRect(doorX + bs * 0.7, doorY + bs * 0.75, 4, 10);

  const boxX = x + bs * 0.3;
  const boxY = y + h - bs * 0.9;
  ctx.fillStyle = '#A07850';
  ctx.fillRect(boxX, boxY, bs * 1.2, bs * 0.7);

  const bookColors = ['#8B4513', '#A0522D', '#CD853F', '#6B4423', '#8B0000', '#4A6B8A'];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const bx = boxX + 6 + col * bs * 0.25;
      const by = boxY - bs * 0.25 - row * bs * 0.35;
      ctx.fillStyle = bookColors[(row * 4 + col) % bookColors.length];
      ctx.fillRect(bx, by, bs * 0.2, bs * 0.35);
    }
  }
}

function renderLighthouse(x, y, w, h, bs) {
  const towerX = x + w * 0.15;
  const towerW = w * 0.7;

  for (let row = 0; row < h / bs - 1; row++) {
    const rowY = y + row * bs;
    const rowShrink = row * 2;
    const rowX = towerX + rowShrink;
    const rowWidth = towerW - rowShrink * 2;

    if (row % 5 < 3) {
      ctx.fillStyle = '#ECEFF1';
    } else {
      ctx.fillStyle = '#B0BEC5';
    }
    ctx.fillRect(rowX, rowY, rowWidth, bs);
  }

  const winY = y + bs * 2.5;
  const winX = towerX + towerW / 2 - bs * 0.15;
  ctx.fillStyle = '#FFE082';
  ctx.fillRect(winX, winY, bs * 0.3, bs * 0.4);

  const doorX = towerX + towerW / 2 - bs * 0.2;
  const doorY = y + h - bs * 1.2;
  ctx.fillStyle = '#5A5A5A';
  ctx.fillRect(doorX, doorY, bs * 0.4, bs * 1.1);

  ctx.fillStyle = '#FFD700';
  ctx.fillRect(doorX + bs * 0.28, doorY + bs * 0.55, 3, 3);

  const topY = y + h - bs * 2;
  const topW = towerW - (h / bs - 2) * 4;
  const topX = towerX + (towerW - topW) / 2;

  ctx.fillStyle = '#E57373';
  ctx.beginPath();
  ctx.moveTo(topX - 4, topY);
  ctx.lineTo(topX + topW / 2, topY - bs * 0.8);
  ctx.lineTo(topX + topW + 4, topY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#78909C';
  ctx.fillRect(topX + topW / 2 - 1, topY - bs * 0.9, 3, bs * 0.25);
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(topX + topW / 2, topY - bs * 0.95, 4, 0, Math.PI * 2);
  ctx.fill();

  const lightY = topY + bs * 0.15;
  const lightSize = bs * 0.6;
  const lightX = topX + topW / 2 - lightSize / 2;

  ctx.fillStyle = '#B3E5FC';
  ctx.fillRect(lightX, lightY, lightSize, bs * 0.5);

  ctx.fillStyle = '#FFF';
  ctx.fillRect(lightX + lightSize * 0.2, lightY + 2, lightSize * 0.6, bs * 0.4);

  if (!_skipAnimations) {
    const t = Date.now() / 1000;
    const beamAngle = (t * 0.8) % (Math.PI * 2);
    ctx.save();
    ctx.translate(topX + topW / 2, lightY + bs * 0.25);
    ctx.rotate(beamAngle);

    const grad = ctx.createLinearGradient(0, 0, 200, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0.4)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(200, -40);
    ctx.lineTo(200, 40);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

function renderDiner(x, y, w, h, bs) {
  for (let i = 0; i < w; i += bs) {
    for (let j = 0; j < h; j += bs) {
      const shade = (Math.floor(i / bs) + Math.floor(j / bs)) % 2 === 0 ? '#8B6B4A' : '#7B5B3A';
      ctx.fillStyle = shade;
      ctx.fillRect(x + i, y + j, bs, bs);
    }
  }

  const lanternY = y - bs * 0.4;

  function drawLantern(lx, ly) {
    ctx.fillStyle = '#E53935';
    ctx.fillRect(lx - bs * 0.2, ly - bs * 0.25, bs * 0.4, bs * 0.45);

    ctx.fillStyle = '#C62828';
    ctx.fillRect(lx - bs * 0.2, ly - bs * 0.25, bs * 0.4, 3);
    ctx.fillRect(lx - bs * 0.2, ly + bs * 0.17, bs * 0.4, 3);

    ctx.fillStyle = '#2C2C2C';
    ctx.fillRect(lx - 2, ly - bs * 0.2, 4, bs * 0.35);

    ctx.fillStyle = '#FFD54F';
    ctx.fillRect(lx - 4, ly - 4, 8, 8);
  }

  drawLantern(x + bs * 0.4, lanternY);
  drawLantern(x + w - bs * 0.4, lanternY);

  const curtainX = x + w / 2 - bs * 0.6;
  const curtainY = y + h - bs * 2.2;
  const curtainW = bs * 1.2;
  const curtainH = bs * 0.8;

  ctx.fillStyle = '#2C4A6B';
  ctx.fillRect(curtainX, curtainY, curtainW, curtainH);

  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 10px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('深夜食堂', curtainX + curtainW / 2, curtainY + curtainH / 2 + 4);
  ctx.textAlign = 'left';

  const doorX = x + w / 2 - bs * 0.4;
  const doorY = y + h - bs * 1.5;
  ctx.fillStyle = '#8B6B4A';
  ctx.fillRect(doorX, doorY, bs * 0.8, bs * 1.5);

  ctx.fillStyle = 'rgba(255,248,220,0.7)';
  ctx.fillRect(doorX + 6, doorY + 6, bs * 0.8 - 12, bs * 0.9);

  ctx.fillStyle = '#6B4B2A';
  ctx.beginPath();
  ctx.moveTo(doorX + bs * 0.4, doorY + 6);
  ctx.lineTo(doorX + bs * 0.4, doorY + bs * 1.4 - 6);
  ctx.stroke();
}

function renderRepairshop(x, y, w, h, bs) {
  for (let i = 0; i < w; i += bs) {
    for (let j = 0; j < h; j += bs) {
      const baseColor = (Math.floor(i / bs) % 2 === 0) ? '#B0BEC5' : '#90A4AE';
      ctx.fillStyle = baseColor;
      ctx.fillRect(x + i, y + j, bs, bs);
    }
  }

  ctx.fillStyle = '#78909C';
  ctx.fillRect(x - 2, y - bs / 2, w + 4, bs / 2 + 2);

  ctx.fillStyle = '#546E7A';
  ctx.fillRect(x + w - 4, y - bs / 2 - 2, 6, bs / 2 + 6);
  ctx.fillRect(x + 2, y - bs / 2 - 2, 6, bs / 2 + 6);

  const doorX = x + w * 0.25;
  const doorY = y + h - bs * 1.8;
  const doorW = w * 0.5;
  const doorH = bs * 1.8;

  ctx.fillStyle = '#7A7A7A';
  ctx.fillRect(doorX, doorY, doorW, doorH);

  for (let i = 0; i < doorW; i += 10) {
    ctx.fillStyle = i % 20 === 0 ? '#8A8A8A' : '#6A6A6A';
    ctx.fillRect(doorX + i, doorY, 8, doorH);
  }

  ctx.fillStyle = '#5A5A5A';
  ctx.fillRect(doorX, doorY, doorW, 5);
  ctx.fillRect(doorX, doorY + doorH - 5, doorW, 5);
  ctx.fillRect(doorX, doorY, 5, doorH);
  ctx.fillRect(doorX + doorW - 5, doorY, 5, doorH);
}

function drawLighthouseBeam(x, y, w, h, bs) {
  const t = Date.now() / 1000;
  const beamAngle = t * 0.8;
  const lightX = x + w / 2;
  const lightY = y - h * 0.2;
  
  ctx.save();
  ctx.translate(lightX, lightY);
  ctx.rotate(beamAngle);
  
  const beamGrad = ctx.createLinearGradient(0, 0, bs * 8, 0);
  beamGrad.addColorStop(0, 'rgba(255, 213, 79, 0.5)');
  beamGrad.addColorStop(0.5, 'rgba(255, 213, 79, 0.25)');
  beamGrad.addColorStop(1, 'rgba(255, 213, 79, 0)');
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(0, -bs * 0.2);
  ctx.lineTo(bs * 8, -bs);
  ctx.lineTo(bs * 8, bs);
  ctx.lineTo(0, bs * 0.2);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
  
  ctx.fillStyle = '#FFD54F';
  ctx.beginPath();
  ctx.arc(lightX, lightY, bs * 0.25, 0, Math.PI * 2);
  ctx.fill();
  
  if (!_skipAnimations) {
    const glowPulse = 0.3 + Math.sin(t * 2) * 0.1;
    ctx.fillStyle = `rgba(255, 213, 79, ${glowPulse})`;
    ctx.beginPath();
    ctx.arc(lightX, lightY, bs * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ==================== 装饰物渲染（带缓存） ====================

function renderDecorations() {
  if (!MAP_DATA) return;

  const bs = CONFIG.BLOCK_SIZE;
  const camX = GameState.camera.x;
  const camY = GameState.camera.y;

  let decos;
  if (_cachedDecorationScreenCoords && _cachedDecorationScreenCoords.camX === camX && _cachedDecorationScreenCoords.camY === camY) {
    decos = _cachedDecorationScreenCoords.items;
  } else {
    decos = MAP_DATA.decorations.map(d => ({
      ...d,
      screenX: d.x * bs - camX,
      screenY: d.y * bs - camY
    }));
    _cachedDecorationScreenCoords = { camX, camY, items: decos };
  }

  const cw = CONFIG.CANVAS_WIDTH;
  const ch = CONFIG.CANVAS_HEIGHT;

  for (let i = 0; i < decos.length; i++) {
    const d = decos[i];
    if (d.screenX < -bs * 2 || d.screenX > cw + bs) continue;
    if (d.screenY < -bs * 2 || d.screenY > ch + bs) continue;

    switch (d.type) {
      case 'tree':
        renderTree(d.screenX, d.screenY, bs);
        break;
      case 'streetlamp':
        renderStreetlamp(d.screenX, d.screenY, bs);
        break;
      case 'flower':
        renderFlower(d.screenX, d.screenY, bs, d.x, d.y);
        break;
    }
  }
}

function renderTree(x, y, bs) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x + bs / 2, y + bs - 4, bs * 0.5, bs * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(x + bs * 0.4, y + bs * 0.5, bs * 0.2, bs * 0.5);
  ctx.fillStyle = '#388E3C';
  ctx.beginPath();
  ctx.arc(x + bs / 2, y + bs * 0.3, bs * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath();
  ctx.arc(x + bs * 0.35, y + bs * 0.2, bs * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function renderStreetlamp(x, y, bs) {
  ctx.fillStyle = '#4A4A4A';
  ctx.fillRect(x + bs * 0.45, y, bs * 0.1, bs);
  ctx.fillStyle = '#FFD54F';
  ctx.fillRect(x + bs * 0.3, y - bs * 0.15, bs * 0.4, bs * 0.25);
  ctx.fillStyle = 'rgba(255,213,79,0.2)';
  ctx.beginPath();
  ctx.arc(x + bs / 2, y - bs * 0.05, bs * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3A3A3A';
  ctx.fillRect(x + bs * 0.4, y + bs - 4, bs * 0.2, 4);
}

function renderFlower(x, y, bs, gridX, gridY) {
  const seed = (gridX * 53 + gridY * 29) % 5;
  const colors = ['#FF6B6B', '#FFD54F', '#FFB6C1', '#E6B8A2', '#B39DDB'];

  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(x + bs * 0.2, y + bs * 0.5, bs * 0.6, bs * 0.2);
  ctx.fillStyle = colors[seed];
  ctx.fillRect(x + bs * 0.3, y + bs * 0.3, bs * 0.15, bs * 0.15);
  ctx.fillRect(x + bs * 0.55, y + bs * 0.35, bs * 0.12, bs * 0.12);
  ctx.fillRect(x + bs * 0.4, y + bs * 0.15, bs * 0.12, bs * 0.12);
  ctx.fillStyle = '#FFF8DC';
  ctx.fillRect(x + bs * 0.35, y + bs * 0.35, bs * 0.06, bs * 0.06);
}

// ==================== 实体渲染 ====================

function renderEntities() {
  const bs = CONFIG.BLOCK_SIZE;
  const cw = CONFIG.CANVAS_WIDTH;
  const ch = CONFIG.CANVAS_HEIGHT;
  const camX = GameState.camera.x;
  const camY = GameState.camera.y;

  const renderList = [];

  if (MAP_DATA) {
    const npcs = MAP_DATA.npcs;
    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      if (npc.id === 'waigong') {
        if (GameState.day >= 2) {
          continue;
        }
      }
      const npcX = npc.x * bs - camX;
      const npcY = npc.y * bs - camY;
      if (npcX < -bs || npcX > cw + bs) continue;
      if (npcY < -bs || npcY > ch + bs) continue;
      renderList.push({
        y: npcY + bs * 1.2,
        draw: () => renderNPC({ ...npc, x: npcX, y: npcY })
      });
    }
  }

  renderList.push({
    y: GameState.player.y - camY + bs * 1.2,
    draw: () => drawPixelChar(
      GameState.player.x - camX,
      GameState.player.y - camY,
      CONFIG.COLORS.player.skin,
      CONFIG.COLORS.player.body,
      CONFIG.COLORS.player.legs,
      CONFIG.COLORS.player.hair,
      true,
      GameState.player.dir,
      GameState.player.animFrame
    )
  });

  renderList.sort((a, b) => a.y - b.y);
  for (let i = 0; i < renderList.length; i++) {
    renderList[i].draw();
  }
}

// ==================== 室内渲染 ====================

function renderIndoor(location) {
  const roomW = CONFIG.CANVAS_WIDTH * CONFIG.ROOM_WIDTH_RATIO;
  const roomH = CONFIG.CANVAS_HEIGHT * CONFIG.ROOM_HEIGHT_RATIO;
  const roomX = (CONFIG.CANVAS_WIDTH - roomW) / 2;
  const roomY = (CONFIG.CANVAS_HEIGHT - roomH) / 2;

  ctx.fillStyle = '#3A2E1F';
  ctx.fillRect(roomX, roomY, roomW, roomH);
  ctx.fillStyle = '#5A4F3E';
  ctx.fillRect(roomX, roomY, roomW, roomH * 0.15);

  const doorWidth = CONFIG.BLOCK_SIZE * 1.6;
  const doorX = roomX + roomW / 2 - doorWidth / 2;
  const doorY = roomY + roomH;

  ctx.fillStyle = '#5D4037';
  ctx.fillRect(doorX - 4, doorY - CONFIG.BLOCK_SIZE * 1.2, 6, CONFIG.BLOCK_SIZE * 1.2);
  ctx.fillRect(doorX + doorWidth - 2, doorY - CONFIG.BLOCK_SIZE * 1.2, 6, CONFIG.BLOCK_SIZE * 1.2);
  ctx.fillRect(doorX - 4, doorY - CONFIG.BLOCK_SIZE * 1.2 - 4, doorWidth + 8, 6);

  ctx.fillStyle = '#4E342E';
  ctx.fillRect(doorX - 4, doorY - 2, doorWidth + 8, 4);

  ctx.fillStyle = 'rgba(200, 180, 160, 0.6)';
  ctx.fillRect(doorX, doorY - CONFIG.BLOCK_SIZE * 1.15, doorWidth, CONFIG.BLOCK_SIZE * 1.15);

  for (let i = 0; i < doorWidth; i += 6) {
    ctx.fillStyle = 'rgba(160, 140, 120, 0.3)';
    ctx.fillRect(doorX + i, doorY - CONFIG.BLOCK_SIZE * 1.15, 3, CONFIG.BLOCK_SIZE * 1.15);
  }

  let furnitureList = [];
  switch(location) {
    case 'oldhouse': furnitureList = renderOldHouseInterior(roomX, roomY, roomW, roomH); break;
    case 'bakery': furnitureList = renderBakeryInterior(roomX, roomY, roomW, roomH); break;
    case 'bookstore': furnitureList = renderBookstoreInterior(roomX, roomY, roomW, roomH); break;
    case 'lighthouse': furnitureList = renderLighthouseInterior(roomX, roomY, roomW, roomH); break;
    case 'diner': furnitureList = renderDinerInterior(roomX, roomY, roomW, roomH); break;
    case 'repairshop': furnitureList = renderRepairShopInterior(roomX, roomY, roomW, roomH); break;
  }

  const renderList = new Array(furnitureList.length);
  for (let i = 0; i < furnitureList.length; i++) {
    renderList[i] = furnitureList[i];
  }

  const indoorNPCs = getIndoorNPCs(GameState.location);
  const indoorScale = CONFIG.INDOOR_CHAR_SCALE || 1.0;
  for (let i = 0; i < indoorNPCs.length; i++) {
    const npc = indoorNPCs[i];
    renderList.push({
      y: npc.y + CONFIG.BLOCK_SIZE * 2.4 * indoorScale,
      draw: () => {
        ctx.save();
        ctx.translate(npc.x, npc.y);
        ctx.scale(indoorScale, indoorScale);
        ctx.translate(-npc.x, -npc.y);
        renderNPC(npc);
        ctx.restore();
      }
    });
  }

  const playerScale = CONFIG.INDOOR_CHAR_SCALE || 1.0;
  const playerHeight = CONFIG.BLOCK_SIZE * 2.4;
  renderList.push({
    y: GameState.player.y + playerHeight * playerScale,
    draw: () => {
      ctx.save();
      ctx.translate(GameState.player.x, GameState.player.y);
      ctx.scale(playerScale, playerScale);
      ctx.translate(-GameState.player.x, -GameState.player.y);
      drawPixelChar(
        GameState.player.x,
        GameState.player.y,
        CONFIG.COLORS.player.skin,
        CONFIG.COLORS.player.body,
        CONFIG.COLORS.player.legs,
        CONFIG.COLORS.player.hair,
        true,
        GameState.player.dir,
        GameState.player.animFrame
      );
      ctx.restore();
    }
  });

  renderList.sort((a, b) => a.y - b.y);
  for (let i = 0; i < renderList.length; i++) {
    renderList[i].draw();
  }

  renderInteractionPrompt();
  renderOverlays();
}

// ==================== NPC 渲染 ====================

function renderNPC(npc) {
  const colors = CONFIG.COLORS[npc.type];
  if (!colors) return;

  const ctx2 = gameCanvas.getContext('2d');
  ctx2.save();

  const skinColor = colors.skin || '#FDE8D4';
  const bodyColor = colors.body || colors.dress || colors.chef || colors.shirt || colors.clothes || '#888888';
  const legsColor = colors.legs || colors.pants || colors.overalls || colors.shoes || '#444444';
  const hairColor = colors.hair || '#5C3A28';

  const t = Date.now() / 1000;
  const npcId = npc.id || npc.type;

  drawPixelChar(
    npc.x,
    npc.y,
    skinColor,
    bodyColor,
    legsColor,
    hairColor,
    false,
    npc.dir || 'down',
    0,
    npcId
  );

  drawNPCAccessory(ctx2, npc, t, skinColor, bodyColor, legsColor, hairColor);

  ctx2.restore();
}

function drawNPCAccessory(ctx, npc, t, skin, body, legs, hair) {
  const bs = CONFIG.BLOCK_SIZE;
  const x = Math.floor(npc.x);
  const y = Math.floor(npc.y);
  const npcId = npc.id || npc.type;
  const indoor = GameState.location !== 'outdoor';
  const scale = indoor ? (CONFIG.INDOOR_CHAR_SCALE || 1.0) : 1.0;
  const baseY = y + bs * 0.35;
  const bobY = Math.sin(t * 1.5 + (npcId.length * 0.5)) * 0.5;

  switch (npcId) {
    case 'waipo':
      drawWaipoAction(ctx, x, baseY, t, bs, skin, body, bobY, scale);
      break;
    case 'waigong':
      drawWaigongAction(ctx, x, baseY, t, bs, skin, body, bobY, scale);
      break;
    case 'fangjie':
      drawFangjieAction(ctx, x, baseY, t, bs, skin, body, bobY, scale);
      break;
    case 'chenbo':
      drawChenboAction(ctx, x, baseY, t, bs, skin, body, hair, bobY, scale);
      break;
    default:
      break;
  }
}

function drawWaipoAction(ctx, x, y, t, bs, skin, body, bobY, scale) {
  const armY = y + bs * 0.15 + bobY;
  const armWave = Math.sin(t * 2) * 2;
  
  ctx.fillStyle = skin;
  ctx.fillRect(x + bs * 0.18, armY + armWave, bs * 0.1, bs * 0.2);
  ctx.fillRect(x + bs * 0.72, armY - armWave, bs * 0.1, bs * 0.2);
  
  const yarnX = x + bs * 0.25 + armWave;
  const yarnY = armY + bs * 0.15;
  ctx.fillStyle = '#E8A6B5';
  ctx.beginPath();
  ctx.arc(yarnX, yarnY, bs * 0.08, 0, Math.PI * 2);
  ctx.fill();
  
  const needleY = yarnY - bs * 0.1;
  ctx.strokeStyle = '#C0C0C0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(yarnX, needleY);
  ctx.lineTo(yarnX + bs * 0.1, needleY - bs * 0.1);
  ctx.stroke();
}

function drawWaigongAction(ctx, x, y, t, bs, skin, body, bobY, scale) {
  const handY = y + bs * 0.2 + bobY;
  const handBob = Math.sin(t * 3) * 3;
  
  ctx.fillStyle = skin;
  ctx.fillRect(x + bs * 0.22, handY + handBob, bs * 0.12, bs * 0.08);
  ctx.fillRect(x + bs * 0.66, handY - handBob, bs * 0.12, bs * 0.08);
  
  const bowlX = x + bs * 0.35;
  const bowlY = handY + bs * 0.1;
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.ellipse(bowlX + bs * 0.15, bowlY, bs * 0.15, bs * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#6B8E23';
  for (let i = 0; i < 5; i++) {
    const bx = bowlX + bs * 0.05 + i * (bs * 0.05);
    const by = bowlY - bs * 0.02 + Math.sin(t * 3 + i) * 1;
    ctx.fillRect(bx, by, bs * 0.03, bs * 0.04);
  }
}

function drawFangjieAction(ctx, x, y, t, bs, skin, body, bobY, scale) {
  const clothX = x + bs * 0.2;
  const clothY = y + bs * 0.1 + bobY;
  const wipeSway = Math.sin(t * 2.5) * 3;
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillRect(clothX + wipeSway, clothY, bs * 0.15, bs * 0.25);
  
  ctx.fillStyle = skin;
  ctx.fillRect(x + bs * 0.2, clothY + bs * 0.05, bs * 0.1, bs * 0.15);
  
  const counterY = y + bs * 0.35;
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x - bs * 0.1, counterY, bs * 1.2, bs * 0.08);
  ctx.fillStyle = '#A0522D';
  ctx.fillRect(x - bs * 0.1, counterY, bs * 1.2, bs * 0.03);
}

function drawChenboAction(ctx, x, y, t, bs, skin, body, hair, bobY, scale) {
  const pushCycle = (t * 0.8) % 3;
  const isPushing = pushCycle < 0.5;
  
  const handY = y + bs * 0.12 + bobY;
  const pushOffset = isPushing ? -2 : 0;
  
  ctx.fillStyle = skin;
  ctx.fillRect(x + bs * 0.35, handY + pushOffset, bs * 0.08, bs * 0.12);
  
  ctx.fillStyle = '#1A1A2E';
  ctx.fillRect(x + bs * 0.33, y + bs * 0.18 + bobY + pushOffset, bs * 0.05, bs * 0.02);
  ctx.fillRect(x + bs * 0.62, y + bs * 0.18 + bobY + pushOffset, bs * 0.05, bs * 0.02);
  ctx.fillRect(x + bs * 0.38, y + bs * 0.18 + bobY + pushOffset, bs * 0.24, bs * 0.015);
  
  const bookY = y + bs * 0.3;
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x + bs * 0.2, bookY, bs * 0.6, bs * 0.04);
  ctx.fillStyle = '#F5DEB3';
  ctx.fillRect(x + bs * 0.25, bookY - bs * 0.02, bs * 0.5, bs * 0.02);
}

// ==================== 室内通用工具函数 ====================

function drawWallShadow(fx, fy, fw, fh) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(fx + 2, fy + 2, fw, fh);
}

function drawGroundShadow(fx, fy, fw) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(fx - 2, fy, fw + 4, 4);
}

function drawDeskShadow(fx, fy, fw, fh) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(fx + 2, fy + 2, fw, fh);
}

function drawLegShadows(fx, fy, fw, legCount, legWidth) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  const spacing = fw / (legCount - 1);
  for (let i = 0; i < legCount; i++) {
    const lx = fx + i * spacing - legWidth / 2;
    ctx.beginPath();
    ctx.ellipse(lx + legWidth / 2, fy, legWidth * 0.8, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ==================== 老房子室内 ====================

function renderOldHouseInterior(roomX, roomY, roomW, roomH) {
  const data = INTERIOR_DATA['oldhouse'];
  if (!data) return [];
  const furnitureList = [];

  ctx.fillStyle = data.background.wall;
  ctx.fillRect(roomX, roomY, roomW, roomH);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.fillRect(roomX, roomY + roomH * 0.75 - 30, roomW, 30);
  ctx.fillStyle = data.background.floor;
  ctx.fillRect(roomX, roomY + roomH * 0.75, roomW, roomH * 0.25);

  for (let i = roomY + roomH * 0.75; i < roomY + roomH; i += 35) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    ctx.fillRect(roomX, i, roomW, 1);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(roomX, i + 1, roomW, 1);
  }

  const baseboardY = roomY + roomH * 0.75;
  ctx.fillStyle = '#D5CFC0';
  ctx.fillRect(roomX, baseboardY - 4, roomW, 6);
  ctx.fillStyle = '#C5BFB0';
  ctx.fillRect(roomX, baseboardY - 5, roomW, 1);
  ctx.fillStyle = '#E5DFD0';
  ctx.fillRect(roomX, baseboardY + 2, roomW, 1);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(roomX, baseboardY + 3, roomW, 2);

  const windowDec = data.decorations.find(d => d.id === 'window');
  if (windowDec) {
    const windowX = roomX + windowDec.x;
    const windowY = roomY + windowDec.y;
    
    const t = Date.now() / 1000;
    const lightSway = Math.sin(t * 0.5) * 10;
    const lightFlicker = 0.08 + Math.sin(t * 1.2) * 0.02;
    
    ctx.fillStyle = `rgba(255, 248, 220, ${lightFlicker})`;
    ctx.beginPath();
    ctx.moveTo(windowX + lightSway, windowY + windowDec.h);
    ctx.lineTo(windowX + windowDec.w + lightSway, windowY + windowDec.h);
    ctx.lineTo(windowX + windowDec.w + 60 + lightSway * 2, roomY + roomH);
    ctx.lineTo(windowX - 20 + lightSway * 2, roomY + roomH);
    ctx.closePath();
    ctx.fill();
    
    for (let i = 0; i < 5; i++) {
      const dustX = windowX + windowDec.w / 2 + Math.sin(t * 0.8 + i * 1.5) * 30 + lightSway;
      const dustY = windowY + 20 + i * 15 + Math.cos(t * 0.6 + i) * 5;
      ctx.fillStyle = `rgba(255, 248, 220, ${0.3 + Math.sin(t + i) * 0.2})`;
      ctx.fillRect(dustX, dustY, 2, 2);
    }
  }

  const decos = data.decorations;
  for (let i = 0; i < decos.length; i++) {
    const dec = decos[i];
    if (dec.sortable) continue;
    const dx = roomX + dec.x;
    const dy = roomY + dec.y;
    switch (dec.id) {
      case 'window':
        ctx.fillStyle = dec.color;
        ctx.fillRect(dx, dy, dec.w, dec.h);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(dx + 4, dy + 4, dec.w - 8, 8);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(dx, dy, dec.w, 3);
        ctx.fillRect(dx, dy + dec.h - 3, dec.w, 3);
        ctx.fillRect(dx, dy, 3, dec.h);
        ctx.fillRect(dx + dec.w - 3, dy, 3, dec.h);
        ctx.fillRect(dx + dec.w / 2 - 1, dy, 2, dec.h);
        ctx.fillRect(dx, dy + dec.h / 2 - 1, dec.w, 2);
        ctx.fillStyle = dec.curtainColor;
        ctx.fillRect(dx - 6, dy - 6, 8, dec.h + 12);
        ctx.fillRect(dx + dec.w - 2, dy - 6, 8, dec.h + 12);
        ctx.fillStyle = 'rgba(255,182,193,0.6)';
        ctx.fillRect(dx - 4, dy - 6, 2, dec.h + 12);
        ctx.fillRect(dx + dec.w + 2, dy - 6, 2, dec.h + 12);
        break;
      case 'painting':
        drawWallShadow(dx, dy, dec.w, dec.h);
        ctx.fillStyle = dec.color;
        ctx.fillRect(dx, dy, dec.w, dec.h);
        ctx.fillStyle = '#FFF8DC';
        ctx.fillRect(dx + 4, dy + 4, dec.w - 8, dec.h - 8);
        ctx.fillStyle = '#FF6B6B';
        ctx.fillRect(dx + 10, dy + 22, 18, 14);
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.moveTo(dx + 8, dy + 22);
        ctx.lineTo(dx + 19, dy + 12);
        ctx.lineTo(dx + 30, dy + 22);
        ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(dx + 58, dy + 16, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#90EE90';
        ctx.fillRect(dx + 6, dy + 36, dec.w - 12, 4);
        break;
      case 'photo_frame':
        drawWallShadow(dx, dy, dec.w, dec.h);
        ctx.fillStyle = dec.color;
        ctx.fillRect(dx, dy, dec.w, dec.h);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(dx + 3, dy + 3, dec.w - 6, dec.h - 6);
        ctx.fillStyle = '#F9D4B4';
        ctx.fillRect(dx + 10, dy + 16, 8, 8);
        ctx.fillRect(dx + 28, dy + 16, 8, 8);
        ctx.fillStyle = '#5C3A28';
        ctx.fillRect(dx + 9, dy + 12, 10, 4);
        ctx.fillStyle = '#E8E8E8';
        ctx.fillRect(dx + 27, dy + 12, 10, 4);
        ctx.fillStyle = '#000';
        ctx.fillRect(dx + 12, dy + 19, 1, 1);
        ctx.fillRect(dx + 15, dy + 19, 1, 1);
        ctx.fillRect(dx + 30, dy + 19, 1, 1);
        ctx.fillRect(dx + 33, dy + 19, 1, 1);
        break;
      case 'house_sign':
        drawWallShadow(dx, dy, dec.w, dec.h);
        ctx.fillStyle = '#5D3A1A';
        ctx.fillRect(dx - 1, dy - 1, dec.w + 2, dec.h + 2);
        ctx.fillStyle = dec.color;
        ctx.fillRect(dx, dy, dec.w, dec.h);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(dx + 4, dy + dec.h - 4, dec.w - 8, 1);
        ctx.fillStyle = '#3D2A10';
        ctx.fillRect(dx + 4, dy - 3, 2, 4);
        ctx.fillRect(dx + dec.w - 6, dy - 3, 2, 4);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 11px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('老房子', dx + dec.w / 2, dy + dec.h / 2 + 4);
        ctx.textAlign = 'left';
        break;
      case 'clock':
        drawWallShadow(dx, dy, dec.w, dec.h);
        renderClock(dx, dy, dec.w, dec.h);
        break;
    }
  }

  const diaryItem = data.items.find(it => it.interaction === 'read_diary');

  const furniture = data.furniture;
  for (let i = 0; i < furniture.length; i++) {
    const f = furniture[i];
    if (!f.sortable) continue;
    const fx = roomX + f.x;
    const fy = roomY + f.y;
    furnitureList.push({
      y: fy + f.h,
      draw: () => {
        switch (f.id) {
          case 'desk':
            drawGroundShadow(fx, fy + f.h, f.w);
            renderDesk(fx, fy, f.w, f.h);
            if (diaryItem) {
              const ix = roomX + diaryItem.x;
              const iy = roomY + diaryItem.y;
              drawDeskShadow(ix, iy, diaryItem.w || 45, diaryItem.h || 18);
              renderDiary(ix, iy, diaryItem.w || 45, diaryItem.h || 18, diaryItem.glow);
              if (GameState.nearDiary && !_skipAnimations) {
                const bounce = Math.sin(performance.now() * 0.005) * 3;
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 14px "Courier New"';
                ctx.textAlign = 'center';
                ctx.fillText('E', ix + (diaryItem.w || 45) / 2, iy - 15 + bounce);
                ctx.textAlign = 'left';
              }
            }
            break;
          case 'wardrobe':
            drawGroundShadow(fx, fy + f.h, f.w);
            renderWardrobe(fx, fy, f.w, f.h, f.color);
            break;
          case 'sofa':
            drawGroundShadow(fx, fy + f.h, f.w);
            renderSofa(fx, fy, f.w, f.h, f.color);
            break;
          case 'tea_table':
            drawGroundShadow(fx, fy + f.h, f.w);
            renderTeaTable(fx, fy, f.w, f.h);
            break;
          case 'bean_basket':
            drawGroundShadow(fx, fy + f.h, f.w);
            renderBeanBasket(fx, fy, f.w, f.h);
            break;
          case 'potted_plant':
            renderPottedPlant(fx, fy, f.w, f.h, f.potColor, f.leafColor);
            break;
          case 'partition_wall':
            renderPartitionWall(fx, fy, f.w, f.h, f.color);
            break;
          case 'desk_lamp':
            drawDeskShadow(fx, fy, f.w, f.h);
            renderDeskLamp(fx, fy, f.w, f.h);
            break;
        }
      }
    });
  }

  return furnitureList;
}

// ==================== 家具绘制函数 ====================

function renderSofa(x, y, w, h, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 3, y + h, w, 4);
  ctx.fillStyle = color || '#8B0000';
  ctx.fillRect(x, y + h * 0.35, w, h * 0.65);
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(x + w * 0.3, y + h * 0.4, 2, h * 0.55);
  ctx.fillRect(x + w * 0.6, y + h * 0.4, 2, h * 0.55);
  ctx.fillStyle = '#A00000';
  ctx.fillRect(x + 8, y, w - 16, h * 0.45);
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(x + 8, y, w - 16, 3);
  ctx.fillStyle = '#700000';
  ctx.fillRect(x, y + h * 0.15, 10, h * 0.6);
  ctx.fillRect(x + w - 10, y + h * 0.15, 10, h * 0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x, y + h * 0.15, 10, 2);
  ctx.fillRect(x + w - 10, y + h * 0.15, 10, 2);
  ctx.fillStyle = '#5C3A28';
  ctx.fillRect(x + 3, y + h, 4, 6);
  ctx.fillRect(x + w - 7, y + h, 4, 6);
  drawLegShadows(x, y + h + 6, w, 2, 10);
}

function renderPartitionWall(x, y, w, h, color) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(x - 1, y + h, w + 2, 3);
  ctx.fillStyle = color || '#D2B48C';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#C4A882';
  ctx.fillRect(x + w, y, 6, h);
  ctx.fillStyle = '#E0C8A8';
  ctx.fillRect(x, y, w + 6, 4);
  ctx.fillStyle = 'rgba(139, 107, 74, 0.35)';
  for (let i = 2; i < w; i += 5) {
    ctx.fillRect(x + i, y + 4, 1, h - 8);
  }
  ctx.fillStyle = 'rgba(139, 107, 74, 0.25)';
  for (let i = 4; i < h; i += 10) {
    ctx.fillRect(x + w + 1, y + i, 4, 1);
  }
}

function renderDesk(x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 3, y + h, w, 4);
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = 'rgba(101,67,33,0.4)';
  ctx.fillRect(x + 10, y + 12, w - 20, 1);
  ctx.fillRect(x + 20, y + 22, w - 40, 1);
  ctx.fillStyle = '#654321';
  const legW = 6;
  const legH = 28;
  ctx.fillRect(x + 4, y + h, legW, legH);
  ctx.fillRect(x + w - 4 - legW, y + h, legW, legH);
  ctx.fillRect(x + w * 0.35, y + h, legW, legH);
  ctx.fillRect(x + w * 0.65 - legW, y + h, legW, legH);
  drawLegShadows(x, y + h + legH, w, 4, legW);
}

function renderDeskLamp(x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(x + 1, y + h, w, 2);
  if (!_skipAnimations) {
    ctx.fillStyle = 'rgba(255, 240, 200, 0.1)';
    ctx.fillRect(x - 30, y + 20, w + 60, 50);
    ctx.fillStyle = 'rgba(255, 240, 200, 0.15)';
    ctx.fillRect(x - 20, y + 20, w + 40, 60);
  }
  ctx.fillStyle = '#2F4F4F';
  ctx.fillRect(x + 2, y + h - 4, w - 4, 4);
  ctx.fillStyle = '#4A4A4A';
  ctx.fillRect(x + w / 2 - 1, y + 4, 2, h - 8);
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.moveTo(x, y + 8);
  ctx.lineTo(x + w, y + 8);
  ctx.lineTo(x + w - 2, y);
  ctx.lineTo(x + 2, y);
  ctx.fill();
  ctx.fillStyle = '#FFF8DC';
  ctx.fillRect(x + w / 2 - 1, y + 2, 2, 4);
}

function renderWardrobe(x, y, w, h, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 3, y + h, w, 4);
  ctx.fillStyle = color || '#8B6B4A';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#6B4423';
  ctx.fillRect(x - 3, y - 5, w + 6, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x, y + 2, w, 3);
  ctx.fillStyle = '#5C3A28';
  const midY = Math.floor(h * 0.4);
  ctx.fillRect(x + w / 2 - 1, y + 4, 2, h - 8);
  ctx.fillStyle = 'rgba(92, 58, 40, 0.3)';
  const stripeCount = Math.max(3, Math.floor(h / 20));
  for (let i = 1; i <= stripeCount; i++) {
    const sy = y + Math.floor(i * h / (stripeCount + 1));
    ctx.fillRect(x + 5, sy, w / 2 - 8, 2);
  }
  for (let i = 1; i <= stripeCount; i++) {
    const sy = y + Math.floor(i * h / (stripeCount + 1));
    ctx.fillRect(x + w / 2 + 3, sy, w / 2 - 8, 2);
  }
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(x + w / 2 - 5, y + midY, 2, 7);
  ctx.fillRect(x + w / 2 + 3, y + midY, 2, 7);
  ctx.fillStyle = '#FFF8DC';
  ctx.fillRect(x + w / 2 - 4, y + midY + 1, 1, 2);
  ctx.fillRect(x + w / 2 + 4, y + midY + 1, 1, 2);
  ctx.fillStyle = '#5C3A28';
  ctx.fillRect(x, y + h - 4, w, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x - 2, y + h, w + 4, 4);
}

function renderTeaTable(x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 2, y + h, w, 3);
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = '#654321';
  ctx.fillRect(x + 6, y + h, 4, 18);
  ctx.fillRect(x + w - 10, y + h, 4, 18);
  drawLegShadows(x, y + h + 18, w, 4, 6);
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x + 14, y - 8, 16, 10);
  ctx.fillStyle = '#654321';
  ctx.fillRect(x + 18, y - 12, 8, 4);
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x + 10, y - 6, 5, 3);
  ctx.fillStyle = '#FFF';
  ctx.fillRect(x + 40, y - 6, 10, 8);
  ctx.fillStyle = '#D2691E';
  ctx.fillRect(x + 42, y - 4, 6, 3);
  ctx.fillStyle = '#FFF';
  ctx.fillRect(x + 56, y - 6, 10, 8);
  ctx.fillStyle = '#D2691E';
  ctx.fillRect(x + 58, y - 4, 6, 3);
}

function renderBeanBasket(x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 2, y + h, w, 3);
  ctx.fillStyle = '#DAA520';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#B8860B';
  ctx.fillRect(x, y + 6, w, 2);
  ctx.fillRect(x, y + 14, w, 2);
  ctx.fillRect(x, y + 22, w, 2);
  ctx.fillRect(x, y + 30, w, 2);
  ctx.fillStyle = 'rgba(184, 134, 11, 0.6)';
  for (let i = 0; i < w; i += 6) {
    ctx.fillRect(x + i, y, 1, h);
  }
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(x - 2, y - 2, w + 4, 4);
  const beans = [
    [10, 8], [18, 6], [26, 9], [36, 7],
    [14, 14], [24, 13], [34, 15],
    [20, 19], [30, 20]
  ];
  ctx.fillStyle = '#228B22';
  for (let i = 0; i < beans.length; i++) {
    ctx.fillRect(x + beans[i][0], y + beans[i][1], 3, 3);
  }
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(x + 22, y + 10, 2, 2);
  ctx.fillRect(x + 38, y + 12, 2, 2);
}

function renderPottedPlant(x, y, w, h, potColor, leafColor) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 2, y + h, w - 4, 2);
  const potTopW = Math.min(w - 2, 18);
  const potBottomW = Math.min(w * 0.6, 12);
  const potH = Math.min(h * 0.45, 10);
  const potY = y + h - potH;
  const leftTop = x + (w - potTopW) / 2;
  const leftBottom = x + (w - potBottomW) / 2;
  ctx.fillStyle = potColor || '#8B4513';
  ctx.beginPath();
  ctx.moveTo(leftTop, potY);
  ctx.lineTo(leftTop + potTopW, potY);
  ctx.lineTo(leftBottom + potBottomW, potY + potH);
  ctx.lineTo(leftBottom, potY + potH);
  ctx.fill();
  ctx.fillStyle = '#654321';
  ctx.fillRect(leftTop - 1, potY - 2, potTopW + 2, 3);
  const leafRadius = Math.min(h * 0.38, 8);
  const leafCenterY = potY - leafRadius + 2;
  ctx.fillStyle = leafColor || '#228B22';
  ctx.beginPath();
  ctx.arc(x + w / 2, leafCenterY, leafRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#32CD32';
  ctx.beginPath();
  ctx.arc(x + w / 2 - leafRadius * 0.3, leafCenterY - leafRadius * 0.2, leafRadius * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function renderClock(x, y, w, h) {
  ctx.fillStyle = '#5D3A1A';
  ctx.fillRect(x, y, w, 3);
  ctx.fillRect(x, y + h - 3, w, 3);
  ctx.fillRect(x, y, 3, h);
  ctx.fillRect(x + w - 3, y, 3, h);
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x + 3, y + 3, w - 6, h * 0.6);
  const dialCx = x + w / 2;
  const dialCy = y + h * 0.3;
  const dialR = Math.min(w, h) * 0.28;
  ctx.fillStyle = '#FFF8DC';
  ctx.beginPath();
  ctx.arc(dialCx, dialCy, dialR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5D3A1A';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#000';
  ctx.fillRect(dialCx - 1, dialCy - dialR + 1, 2, 2);
  ctx.fillRect(dialCx - 1, dialCy + dialR - 3, 2, 2);
  ctx.fillRect(dialCx - dialR + 1, dialCy - 1, 2, 2);
  ctx.fillRect(dialCx + dialR - 3, dialCy - 1, 2, 2);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(dialCx, dialCy);
  ctx.lineTo(dialCx - dialR * 0.4, dialCy - dialR * 0.4);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(dialCx, dialCy);
  ctx.lineTo(dialCx + dialR * 0.55, dialCy - dialR * 0.3);
  ctx.stroke();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(dialCx, dialCy, 1.5, 0, Math.PI * 2);
  ctx.fill();

  if (!_skipAnimations) {
    const pendulumTopY = y + h * 0.6;
    const pendulumSwing = Math.sin(performance.now() * 0.003) * 4;
    const pendulumBottomX = dialCx + pendulumSwing;
    const pendulumBottomY = y + h - 8;
    ctx.strokeStyle = '#5D3A1A';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dialCx, pendulumTopY);
    ctx.lineTo(pendulumBottomX, pendulumBottomY);
    ctx.stroke();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(pendulumBottomX, pendulumBottomY + 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF8DC';
    ctx.beginPath();
    ctx.arc(pendulumBottomX - 1, pendulumBottomY + 1, 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderDiary(x, y, w, h, glow) {
  if (glow && !_skipAnimations) {
    ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
    ctx.fillRect(x - 14, y - 14, w + 28, h + 28);
    ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
    ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
  }
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(x + 4, y + 4, w - 8, 1);
  ctx.fillRect(x + 4, y + h - 5, w - 8, 1);
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 9px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('外婆的日记', x + w / 2, y + h / 2 + 3);
  ctx.textAlign = 'left';
}

// ==================== 通用室内渲染（数据驱动） ====================

function renderGenericInterior(sceneId, roomX, roomY, roomW, roomH) {
  const data = INTERIOR_DATA[sceneId];
  if (!data) return [];
  const furnitureList = [];

  const bg = data.background;
  const floorY = roomY + roomH * 0.7;

  ctx.fillStyle = bg.wall;
  ctx.fillRect(roomX, roomY, roomW, roomH);

  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  ctx.fillRect(roomX, floorY - 30, roomW, 30);

  ctx.fillStyle = bg.floor;
  ctx.fillRect(roomX, floorY, roomW, roomH * 0.3);

  ctx.fillStyle = '#D5CFC0';
  ctx.fillRect(roomX, floorY - 4, roomW, 6);
  ctx.fillStyle = '#C5BFB0';
  ctx.fillRect(roomX, floorY - 5, roomW, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(roomX, floorY + 3, roomW, 2);

  const decos = data.decorations;
  for (let i = 0; i < decos.length; i++) {
    const dec = decos[i];
    if (dec.sortable) continue;
    const dx = roomX + dec.x;
    const dy = roomY + dec.y;
    renderGenericDecoration(dec, dx, dy);
  }

  const furniture = data.furniture;
  for (let i = 0; i < furniture.length; i++) {
    const f = furniture[i];
    if (!f.sortable) continue;
    const fx = roomX + f.x;
    const fy = roomY + f.y;
    furnitureList.push({
      y: fy + f.h,
      draw: () => renderGenericFurniture(f, fx, fy)
    });
  }

  const items = data.items || [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    // 已拾取的物品不渲染
    if (GameState.inventory.some(inv => inv.id === item.id)) continue;
    // 日记本已读则不作为可拾取物品渲染（由 oldhouse 专属逻辑处理）
    if (item.interaction === 'read_diary' && GameState.flags.hasDiary) continue;
    // 未到解锁天数的物品不渲染
    if (item.unlockDay && GameState.day < item.unlockDay) continue;
    const ix = roomX + item.x;
    const iy = roomY + item.y;
    furnitureList.push({
      y: iy + (item.h || 20) + 2,
      draw: () => renderGenericItem(item, ix, iy)
    });
  }

  return furnitureList;
}

function renderGenericDecoration(dec, x, y) {
  const w = dec.w;
  const h = dec.h;

  switch (dec.id) {
    case 'display_window':
    case 'green_window':
    case 'round_window':
      ctx.fillStyle = dec.color || '#87CEEB';
      if (dec.id === 'round_window') {
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, w / 2 - 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = dec.frameColor || '#FFF';
        ctx.lineWidth = 4;
        ctx.stroke();
      } else {
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(x + 4, y + 4, w - 8, 10);
        ctx.fillStyle = dec.frameColor || '#FFF';
        ctx.fillRect(x, y, w, 4);
        ctx.fillRect(x, y + h - 4, w, 4);
        ctx.fillRect(x, y, 4, h);
        ctx.fillRect(x + w - 4, y, 4, h);
        ctx.fillRect(x + w / 2 - 1, y, 2, h);
        ctx.fillRect(x, y + h / 2 - 1, w, 2);
      }
      break;

    case 'bakery_sign':
    case 'bookstore_sign':
    case 'diner_sign':
    case 'iron_sign':
    case 'wall_clock':
      drawWallShadow(x, y, w, h);
      ctx.fillStyle = dec.color || '#8B4513';
      ctx.fillRect(x, y, w, h);
      if (dec.textColor) {
        ctx.fillStyle = dec.textColor;
        ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        const textMap = {
          'bakery_sign': '今日特供',
          'bookstore_sign': '静',
          'diner_sign': '深夜食堂',
          'iron_sign': '修理铺'
        };
        const text = textMap[dec.id] || '';
        ctx.fillText(text, x + w / 2, y + h / 2 + 4);
        ctx.textAlign = 'left';
      }
      if (dec.id === 'wall_clock') {
        renderClock(x, y, w, h);
      }
      break;

    case 'lantern_light':
      if (!_skipAnimations) {
        ctx.fillStyle = dec.glowColor || 'rgba(255,213,79,0.3)';
        ctx.fillRect(x - 10, y - 10, w + 20, h + 20);
      }
      ctx.fillStyle = dec.color || '#FFD54F';
      ctx.fillRect(x + w * 0.3, y, w * 0.4, h * 0.7);
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x + w * 0.35, y + h * 0.7, w * 0.3, h * 0.3);
      break;

    case 'old_map':
      drawWallShadow(x, y, w, h);
      ctx.fillStyle = dec.color || '#DEB887';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.2, y + h * 0.7);
      ctx.lineTo(x + w * 0.5, y + h * 0.3);
      ctx.lineTo(x + w * 0.8, y + h * 0.6);
      ctx.stroke();
      break;

    case 'compass_deco':
      drawWallShadow(x, y, w, h);
      ctx.fillStyle = dec.color || '#8B4513';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 2 - 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFF8DC';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 2 - 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#CD5C5C';
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + 8);
      ctx.lineTo(x + w / 2 - 4, y + h / 2);
      ctx.lineTo(x + w / 2 + 4, y + h / 2);
      ctx.fill();
      ctx.fillStyle = '#4A4A4A';
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + h - 8);
      ctx.lineTo(x + w / 2 - 4, y + h / 2);
      ctx.lineTo(x + w / 2 + 4, y + h / 2);
      ctx.fill();
      break;

    case 'gear_deco':
      ctx.fillStyle = dec.color || '#808080';
      const gcx = x + w / 2;
      const gcy = y + h / 2;
      const gr = w / 2 - 8;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const tx = gcx + Math.cos(angle) * gr;
        const ty = gcy + Math.sin(angle) * gr;
        ctx.fillRect(tx - 4, ty - 4, 8, 8);
      }
      ctx.beginPath();
      ctx.arc(gcx, gcy, gr - 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#606060';
      ctx.beginPath();
      ctx.arc(gcx, gcy, 8, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'message_wall':
      drawWallShadow(x, y, w, h);
      ctx.fillStyle = dec.color || '#DEB887';
      ctx.fillRect(x, y, w, h);
      const noteColors = ['#FFF8DC', '#FFE4B5', '#FFE4E1', '#E6E6FA'];
      for (let i = 0; i < 6; i++) {
        const nx = x + 10 + (i % 3) * (w - 20) / 3;
        const ny = y + 10 + Math.floor(i / 3) * (h - 20) / 2;
        ctx.fillStyle = noteColors[i % noteColors.length];
        ctx.fillRect(nx, ny, 25, 18);
      }
      break;

    case 'parts_wall':
      drawWallShadow(x, y, w, h);
      ctx.fillStyle = dec.color || '#4A4A4A';
      ctx.fillRect(x, y, w, h);
      const shelfColor = dec.shelfColor || '#6B6B6B';
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = shelfColor;
        ctx.fillRect(x + 5, y + 10 + i * (h - 20) / 5, w - 10, 2);
      }
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = ['#FFD700', '#CD5C5C', '#4ECDC4', '#A0A0A0'][i % 4];
        const gx = x + 8 + (i % 3) * (w - 16) / 3;
        const gy = y + 16 + Math.floor(i / 3) * (h - 24) / 4;
        ctx.fillRect(gx, gy, 10, 8);
      }
      break;

    case 'spiral_stairs':
      ctx.fillStyle = dec.color || '#8B4513';
      const steps = 10;
      for (let i = 0; i < steps; i++) {
        const sy = y + i * (h / steps);
        const sw = w * (0.3 + 0.7 * (i / steps));
        const sx = x + (w - sw) / 2 + Math.sin(i * 0.8) * 10;
        ctx.fillRect(sx, sy, sw, 3);
        ctx.fillStyle = '#654321';
        ctx.fillRect(sx, sy + 3, 2, h / steps - 3);
        ctx.fillStyle = dec.color || '#8B4513';
      }
      break;

    case 'crystal_lamp':
      if (!_skipAnimations) {
        ctx.fillStyle = dec.glowColor || 'rgba(255,215,0,0.3)';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, w * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x + w * 0.4, y - 5, w * 0.2, 8);
      ctx.fillStyle = dec.color || '#FFD700';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.3, y + h * 0.3);
      ctx.lineTo(x + w * 0.7, y + h * 0.3);
      ctx.lineTo(x + w * 0.8, y + h * 0.7);
      ctx.lineTo(x + w * 0.2, y + h * 0.7);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x + w * 0.35, y + h * 0.4, w * 0.1, h * 0.2);
      break;
  }
}

function renderGenericFurniture(f, x, y) {
  const w = f.w;
  const h = f.h;

  drawGroundShadow(x, y + h, w);

  switch (f.id) {
    case 'glass_counter':
      ctx.fillStyle = f.color || '#8B4513';
      ctx.fillRect(x, y + h * 0.4, w, h * 0.6);
      ctx.fillStyle = f.glassColor || 'rgba(200,230,255,0.5)';
      ctx.fillRect(x + 5, y, w - 10, h * 0.45);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x + 8, y + 4, 10, 4);
      ctx.fillStyle = '#D2691E';
      for (let i = 0; i < 4; i++) {
        const bx = x + 15 + i * (w - 30) / 4;
        ctx.beginPath();
        ctx.ellipse(bx + 10, y + h * 0.3, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'bread_shelf':
      ctx.fillStyle = f.color || '#8B4513';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#654321';
      for (let i = 1; i < 4; i++) {
        ctx.fillRect(x + 5, y + i * h / 4, w - 10, 3);
      }
      const breadColors = ['#D2691E', '#DEB887', '#CD853F', '#F4A460'];
      for (let i = 0; i < 9; i++) {
        const bx = x + 12 + (i % 3) * (w - 24) / 3;
        const by = y + 10 + Math.floor(i / 3) * (h - 20) / 3;
        ctx.fillStyle = breadColors[i % breadColors.length];
        ctx.beginPath();
        ctx.ellipse(bx + 12, by + 10, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'oven':
      ctx.fillStyle = f.color || '#4A4A4A';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = f.doorColor || '#2F2F2F';
      ctx.fillRect(x + 8, y + 10, w - 16, h * 0.6);
      ctx.fillStyle = '#3A3A3A';
      ctx.fillRect(x + 12, y + 14, w - 24, h * 0.5);
      if (!_skipAnimations) {
        ctx.fillStyle = 'rgba(255,100,0,0.4)';
        ctx.fillRect(x + 14, y + 16, w - 28, h * 0.4);
      }
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x + w - 18, y + 5, 10, 4);
      break;

    case 'round_table':
      ctx.fillStyle = f.color || '#8B4513';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 3, w / 3, h / 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#654321';
      ctx.fillRect(x + w / 2 - 5, y + h, 10, 20);
      drawLegShadows(x, y + h + 20, w, 1, 10);
      break;

    case 'stool':
      ctx.fillStyle = f.color || '#A0522D';
      ctx.fillRect(x, y, w, h * 0.4);
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x + 4, y + h * 0.4, 4, h * 0.6);
      ctx.fillRect(x + w - 8, y + h * 0.4, 4, h * 0.6);
      drawLegShadows(x, y + h, w, 2, 6);
      break;

    case 'bookshelf_left':
    case 'bookshelf_right':
      ctx.fillStyle = f.color || '#8B4513';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#654321';
      for (let i = 1; i < 6; i++) {
        ctx.fillRect(x + 4, y + i * h / 6, w - 8, 2);
      }
      const bookColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          const bx = x + 6 + col * (w - 12) / 5;
          const by = y + 5 + row * (h - 10) / 5;
          const seed = (row * 5 + col + f.x) % 10;
          if (seed < 7) {
            ctx.fillStyle = bookColors[(row + col) % bookColors.length];
            ctx.fillRect(bx, by, 8, (h - 10) / 5 - 4);
          }
        }
      }
      break;

    case 'reading_sofa':
      renderSofa(x, y, w, h, f.color || '#800000');
      break;

    case 'cashier_desk':
      ctx.fillStyle = f.color || '#8B4513';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = '#654321';
      ctx.fillRect(x + 4, y + h, 6, 20);
      ctx.fillRect(x + w - 10, y + h, 6, 20);
      drawLegShadows(x, y + h + 20, w, 2, 6);
      ctx.fillStyle = '#2F4F4F';
      ctx.fillRect(x + w * 0.6, y - 30, w * 0.35, 35);
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(x + w * 0.62, y - 26, w * 0.3, 20);
      break;

    case 'ladder':
      ctx.fillStyle = f.color || '#A0522D';
      ctx.fillRect(x, y, 6, h);
      ctx.fillRect(x + w - 6, y, 6, h);
      for (let i = 1; i < 6; i++) {
        ctx.fillRect(x, y + i * h / 6, w, 3);
      }
      break;

    case 'chart_desk':
      ctx.fillStyle = f.color || '#8B4513';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = f.topColor || '#87CEEB';
      ctx.fillRect(x + 5, y + 3, w - 10, h * 0.35);
      ctx.strokeStyle = '#4682B4';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.25, 10 + i * 12, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#CD5C5C';
      ctx.fillRect(x + w * 0.7, y + h * 0.15, 3, 3);
      ctx.fillStyle = '#654321';
      ctx.fillRect(x + 4, y + h, 6, 25);
      ctx.fillRect(x + w - 10, y + h, 6, 25);
      drawLegShadows(x, y + h + 25, w, 2, 6);
      break;

    case 'keeper_bed':
      ctx.fillStyle = f.color || '#8B4513';
      ctx.fillRect(x, y + h * 0.4, w, h * 0.6);
      ctx.fillStyle = f.mattressColor || '#FFF';
      ctx.fillRect(x + 4, y + h * 0.25, w - 8, h * 0.35);
      ctx.fillStyle = '#E8E8E8';
      ctx.fillRect(x + 6, y + h * 0.45, w - 12, h * 0.1);
      ctx.fillStyle = '#F5F5F5';
      ctx.fillRect(x + 8, y + h * 0.1, w * 0.35, h * 0.2);
      break;

    case 'u_counter':
      ctx.fillStyle = f.color || '#8B4513';
      ctx.fillRect(x, y + h * 0.3, w, h * 0.7);
      ctx.fillStyle = f.topColor || '#D2691E';
      ctx.fillRect(x, y + h * 0.2, w, h * 0.15);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(x, y + h * 0.2, w, 2);
      ctx.fillStyle = '#FFF';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(x + 20 + i * 40, y + h * 0.5, 8, 6);
      }
      break;

    case 'stove':
      ctx.fillStyle = f.color || '#4A4A4A';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#2F2F2F';
      ctx.fillRect(x + 8, y + 10, w - 16, h * 0.5);
      ctx.fillStyle = '#3A3A3A';
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.arc(x + w * 0.35 + i * w * 0.3, y + h * 0.35, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!_skipAnimations) {
        ctx.fillStyle = 'rgba(255,100,0,0.3)';
        ctx.beginPath();
        ctx.arc(x + w * 0.35, y + h * 0.35, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'counter_stool':
      ctx.fillStyle = f.color || '#A0522D';
      ctx.fillRect(x, y, w, h * 0.3);
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x + w / 2 - 3, y + h * 0.3, 6, h * 0.7);
      ctx.fillRect(x + w / 2 - 10, y + h - 4, 20, 4);
      break;

    case 'workbench':
      ctx.fillStyle = f.color || '#8B4513';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = f.topColor || '#A0522D';
      ctx.fillRect(x, y, w, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(x, y, w, 2);
      ctx.fillStyle = '#654321';
      ctx.fillRect(x + 8, y + h, 8, 25);
      ctx.fillRect(x + w - 16, y + h, 8, 25);
      drawLegShadows(x, y + h + 25, w, 2, 8);
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(x + w * 0.3, y - 8, 4, 12);
      ctx.fillStyle = '#CD5C5C';
      ctx.fillRect(x + w * 0.5, y - 10, 6, 14);
      break;

    case 'old_radio':
      ctx.fillStyle = f.color || '#5D4037';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = f.dialColor || '#FFD700';
      ctx.fillRect(x + w * 0.15, y + h * 0.2, w * 0.7, h * 0.25);
      ctx.fillStyle = '#8B4513';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(x + w * 0.2 + i * w * 0.12, y + h * 0.25, 1, h * 0.15);
      }
      ctx.fillStyle = '#4A4A4A';
      ctx.beginPath();
      ctx.arc(x + w * 0.25, y + h * 0.7, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + w * 0.75, y + h * 0.7, 10, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'grandfather_clock':
      ctx.fillStyle = f.color || '#8B4513';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(x, y, w, 4);
      ctx.fillStyle = f.faceColor || '#FFF8DC';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h * 0.3, w * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5D3A1A';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + h * 0.3);
      ctx.lineTo(x + w / 2 - 6, y + h * 0.15);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + h * 0.3);
      ctx.lineTo(x + w / 2 + 8, y + h * 0.2);
      ctx.stroke();
      if (!_skipAnimations) {
        const swing = Math.sin(performance.now() * 0.003) * 4;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(x + w / 2 + swing, y + h * 0.75, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'message_wall':
      drawWallShadow(x, y, w, h);
      ctx.fillStyle = f.color || '#DEB887';
      ctx.fillRect(x, y, w, h);
      const noteColors = ['#FFF8DC', '#FFE4B5', '#FFE4E1', '#E6E6FA'];
      for (let i = 0; i < 6; i++) {
        const nx = x + 10 + (i % 3) * (w - 20) / 3;
        const ny = y + 10 + Math.floor(i / 3) * (h - 20) / 2;
        ctx.fillStyle = noteColors[i % noteColors.length];
        ctx.fillRect(nx, ny, 25, 18);
      }
      break;

    case 'parts_wall':
      drawWallShadow(x, y, w, h);
      ctx.fillStyle = f.color || '#4A4A4A';
      ctx.fillRect(x, y, w, h);
      const shelfColor = f.shelfColor || '#6B6B6B';
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = shelfColor;
        ctx.fillRect(x + 5, y + 10 + i * (h - 20) / 5, w - 10, 2);
      }
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = ['#FFD700', '#CD5C5C', '#4ECDC4', '#A0A0A0'][i % 4];
        const gx = x + 8 + (i % 3) * (w - 16) / 3;
        const gy = y + 16 + Math.floor(i / 3) * (h - 24) / 4;
        ctx.fillRect(gx, gy, 10, 8);
      }
      break;

    case 'spiral_stairs':
      ctx.fillStyle = f.color || '#8B4513';
      const steps = 10;
      for (let i = 0; i < steps; i++) {
        const sy = y + i * (h / steps);
        const sw = w * (0.3 + 0.7 * (i / steps));
        const sx = x + (w - sw) / 2 + Math.sin(i * 0.8) * 10;
        ctx.fillRect(sx, sy, sw, 3);
        ctx.fillStyle = '#654321';
        ctx.fillRect(sx, sy + 3, 2, h / steps - 3);
        ctx.fillStyle = f.color || '#8B4513';
      }
      break;

    case 'crystal_lamp':
      if (!_skipAnimations) {
        ctx.fillStyle = f.glowColor || 'rgba(255,215,0,0.3)';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, w * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x + w * 0.4, y - 5, w * 0.2, 8);
      ctx.fillStyle = f.color || '#FFD700';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.3, y + h * 0.3);
      ctx.lineTo(x + w * 0.7, y + h * 0.3);
      ctx.lineTo(x + w * 0.8, y + h * 0.7);
      ctx.lineTo(x + w * 0.2, y + h * 0.7);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x + w * 0.35, y + h * 0.4, w * 0.1, h * 0.2);
      break;
  }
}

function renderGenericItem(item, x, y) {
  const w = item.w || 20;
  const h = item.h || 20;

  const floatY = Math.sin(Date.now() * 0.003) * 3;
  const displayY = y + floatY;

  if (item.glow && !_skipAnimations) {
    const pulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255, 215, 0, ${0.15 * pulse})`;
    ctx.beginPath();
    ctx.arc(x + w / 2, displayY + h / 2, w + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 215, 0, ${0.25 * pulse})`;
    ctx.beginPath();
    ctx.arc(x + w / 2, displayY + h / 2, w / 2 + 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const boxW = 16;
  const boxH = 16;
  const boxX = x + (w - boxW) / 2;
  const boxY = displayY + (h - boxH) / 2;

  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.icon || '✨', boxX + boxW / 2, boxY + boxH / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ==================== 各场景入口函数 ====================

let bakerySteamParticles = [];
let lastSteamSpawnTime = 0;

function updateBakerySteam(roomX, roomY, roomW, roomH) {
  if (_skipAnimations) return;
  
  const now = Date.now();
  if (now - lastSteamSpawnTime > 200) {
    lastSteamSpawnTime = now;
    const ovenX = roomX + roomW * 0.75;
    const ovenY = roomY + roomH * 0.55;
    bakerySteamParticles.push({
      x: ovenX + Math.random() * 40 - 20,
      y: ovenY,
      vy: -0.5 - Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      life: 1,
      maxLife: 2 + Math.random(),
      size: 8 + Math.random() * 8
    });
  }
  
  for (let i = bakerySteamParticles.length - 1; i >= 0; i--) {
    const p = bakerySteamParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.016;
    if (p.life <= 0) {
      bakerySteamParticles.splice(i, 1);
    }
  }
}

function drawBakerySteam() {
  if (_skipAnimations) return;
  
  for (const p of bakerySteamParticles) {
    const alpha = (p.life / p.maxLife) * 0.4;
    const size = p.size * (1 + (1 - p.life / p.maxLife) * 0.5);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderBakeryInterior(roomX, roomY, roomW, roomH) {
  const furnitureList = renderGenericInterior('bakery', roomX, roomY, roomW, roomH);
  
  if (GameState.location === 'bakery') {
    updateBakerySteam(roomX, roomY, roomW, roomH);
    furnitureList.push({
      y: roomY + roomH * 0.5,
      draw: () => drawBakerySteam()
    });
  }
  
  return furnitureList;
}

function renderBookstoreInterior(roomX, roomY, roomW, roomH) {
  return renderGenericInterior('bookstore', roomX, roomY, roomW, roomH);
}

function renderLighthouseInterior(roomX, roomY, roomW, roomH) {
  return renderGenericInterior('lighthouse', roomX, roomY, roomW, roomH);
}

function renderDinerInterior(roomX, roomY, roomW, roomH) {
  return renderGenericInterior('diner', roomX, roomY, roomW, roomH);
}

function renderRepairShopInterior(roomX, roomY, roomW, roomH) {
  return renderGenericInterior('repairshop', roomX, roomY, roomW, roomH);
}

// ==================== 室外物品渲染 ====================

function renderOutdoorItems() {
  if (!MAP_DATA || !MAP_DATA.items) return;
  const bs = CONFIG.BLOCK_SIZE;
  const camX = GameState.camera.x;
  const camY = GameState.camera.y;

  for (let i = 0; i < MAP_DATA.items.length; i++) {
    const item = MAP_DATA.items[i];
    // 已拾取的物品不渲染
    if (GameState.inventory.some(inv => inv.id === item.id)) continue;
    // 未到解锁天数的物品不渲染
    if (item.unlockDay && GameState.day < item.unlockDay) continue;

    const ix = item.x * bs - camX;
    const iy = item.y * bs - camY;

    // 视口裁剪
    if (ix < -bs || ix > CONFIG.CANVAS_WIDTH + bs) continue;
    if (iy < -bs || iy > CONFIG.CANVAS_HEIGHT + bs) continue;

    // 发光效果
    if (!_skipAnimations) {
      const pulse = Math.sin(performance.now() * 0.003) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 215, 0, ${0.15 * pulse})`;
      ctx.fillRect(ix - 10, iy - 10, bs + 20, bs + 20);
      ctx.fillStyle = `rgba(255, 215, 0, ${0.25 * pulse})`;
      ctx.fillRect(ix - 5, iy - 5, bs + 10, bs + 10);
    }

    // 物品本体
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(ix + 4, iy + 4, bs - 8, bs - 8);
    ctx.fillStyle = '#FFF8DC';
    ctx.fillRect(ix + 8, iy + 8, bs - 16, bs - 16);

    // 图标
    if (item.icon) {
      ctx.font = `${bs * 0.5}px "Courier New"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.icon, ix + bs / 2, iy + bs / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  }
}

// ==================== 交互提示渲染 ====================

function renderInteractionPrompt() {
  if (GameState.dialogueActive) return;

  let screenX, screenY;

  if (GameState.location === 'outdoor') {
    screenX = GameState.player.x - GameState.camera.x;
    screenY = GameState.player.y - GameState.camera.y;
  } else {
    screenX = GameState.player.x;
    screenY = GameState.player.y;
  }

  const bounce = Math.sin(Date.now() * 0.005) * 3;

  // E键提示：NPC对话、道具拾取、阅读日记
  if (GameState.nearNPC) {
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('[E] 对话', screenX, screenY - 30 + bounce);
    ctx.textAlign = 'left';
  } else if (GameState.nearItem) {
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('[E] 拾取', screenX, screenY - 30 + bounce);
    ctx.textAlign = 'left';
  } else if (GameState.nearDiary) {
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('[E] 阅读', screenX, screenY - 30 + bounce);
    ctx.textAlign = 'left';
  }

  // 空格键提示：进入建筑、离开建筑、睡觉
  if (GameState.nearBuilding) {
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold 12px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('[空格] 进入', screenX, screenY - 46 + bounce);
    ctx.textAlign = 'left';
  } else if (GameState.nearExit) {
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold 12px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('[空格] 离开', screenX, screenY - 46 + bounce);
    ctx.textAlign = 'left';
  } else if (GameState.nearBed) {
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold 12px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('[空格] 休息', screenX, screenY - 46 + bounce);
    ctx.textAlign = 'left';
  }
}

// ==================== 叠加层渲染（飞行动画、黑屏、天数提示）====================

function renderOverlays() {
  // 物品飞行动画
  if (GameState.itemFlyAnim) {
    const anim = GameState.itemFlyAnim;
    const t = anim.progress;
    const targetX = CONFIG.CANVAS_WIDTH / 2;
    const targetY = CONFIG.CANVAS_HEIGHT / 2;
    const curX = anim.startX + (targetX - anim.startX) * t;
    const curY = anim.startY + (targetY - anim.startY) * t;
    const scale = 1 + t * 0.5;
    const alpha = 1 - t * 0.3;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(curX - 10 * scale, curY - 10 * scale, 20 * scale, 20 * scale);
    ctx.fillStyle = '#FFF8DC';
    ctx.fillRect(curX - 6 * scale, curY - 6 * scale, 12 * scale, 12 * scale);
    ctx.restore();
  }

  // 睡觉黑屏
  if (GameState.sleepFade > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${GameState.sleepFade})`;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
  }

  // 天数切换提示
  if (GameState.dayTransitionText) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, CONFIG.CANVAS_HEIGHT / 2 - 40, CONFIG.CANVAS_WIDTH, 80);
    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 28px "Microsoft YaHei", serif';
    ctx.textAlign = 'center';
    ctx.fillText(GameState.dayTransitionText, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 10);
    ctx.textAlign = 'left';
  }
}