const keys = {};

function initInput() {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
}

function handleKeyDown(e) {
  keys[e.code] = true;

  if (e.code === 'Escape') {
    handleEscape();
  }

  if (e.code === 'KeyB') {
    toggleBackpack();
  }

  if (e.code === 'KeyJ') {
    toggleDiscovery();
  }

  if (e.code === 'KeyM') {
    toggleMusic();
  }

  if (e.code === 'KeyE') {
    handleInteractE();
  }

  if (e.code === 'Space') {
    handleInteractSpace();
  }
}

function handleKeyUp(e) {
  keys[e.code] = false;
}

function handleEscape() {
  if (GameState.location !== 'outdoor') {
    leaveBuilding();
  } else if (GameState.currentDialogue) {
    endDialogue();
  }
}

function updatePlayer(deltaTime) {
  const bs = CONFIG.BLOCK_SIZE;
  const speed = CONFIG.PLAYER_SPEED * deltaTime;

  let dx = 0;
  let dy = 0;

  if (keys['KeyW'] || keys['ArrowUp']) dy -= speed;
  if (keys['KeyS'] || keys['ArrowDown']) dy += speed;
  if (keys['KeyA'] || keys['ArrowLeft']) dx -= speed;
  if (keys['KeyD'] || keys['ArrowRight']) dx += speed;

  if (dx !== 0 || dy !== 0) {
    GameState.player.isMoving = true;

    if (dx > 0) GameState.player.dir = 'right';
    else if (dx < 0) GameState.player.dir = 'left';
    else if (dy > 0) GameState.player.dir = 'down';
    else if (dy < 0) GameState.player.dir = 'up';

    GameState.player.animFrame = (GameState.player.animFrame + deltaTime * 8) % 2;

    let newX = GameState.player.x + dx;
    let newY = GameState.player.y + dy;

    if (GameState.location === 'outdoor') {
      newX = Math.max(bs, Math.min(CONFIG.WORLD_WIDTH - bs, newX));
      newY = Math.max(bs, Math.min(CONFIG.WORLD_HEIGHT - bs, newY));

      if (!checkBuildingCollision(newX, newY)) {
        GameState.player.x = newX;
        GameState.player.y = newY;
        updateCamera();
      }
    } else {
      const roomW = CONFIG.CANVAS_WIDTH * 0.65;
      const roomH = CONFIG.CANVAS_HEIGHT * 0.7;
      const roomX = (CONFIG.CANVAS_WIDTH - roomW) / 2;
      const roomY = (CONFIG.CANVAS_HEIGHT - roomH) / 2;
      const margin = bs * 0.3;

      newX = Math.max(roomX + margin, Math.min(roomX + roomW - margin, newX));
      newY = Math.max(roomY + margin, Math.min(roomY + roomH - margin, newY));
      GameState.player.x = newX;
      GameState.player.y = newY;
    }

    checkProximity();
  } else {
    GameState.player.isMoving = false;
    GameState.player.animFrame = 0;
  }
}

function checkBuildingCollision(x, y) {
  if (!MAP_DATA || !MAP_DATA.buildings) return false;
  const bs = CONFIG.BLOCK_SIZE;
  const playerRadius = bs * 0.15;

  for (const building of MAP_DATA.buildings) {
    const bLeft = building.x * bs;
    const bRight = (building.x + building.w) * bs;
    const bTop = building.y * bs;
    const bBottom = (building.y + building.h) * bs;

    if (x + playerRadius > bLeft && x - playerRadius < bRight &&
        y + playerRadius > bTop && y - playerRadius < bBottom) {
      return true;
    }
  }
  return false;
}

function updateCamera() {
  const targetX = GameState.player.x - CONFIG.CANVAS_WIDTH / 2;
  const targetY = GameState.player.y - CONFIG.CANVAS_HEIGHT / 2;

  GameState.camera.x = lerp(GameState.camera.x, targetX, CONFIG.CAMERA_SMOOTH);
  GameState.camera.y = lerp(GameState.camera.y, targetY, CONFIG.CAMERA_SMOOTH);

  GameState.camera.x = Math.max(0, Math.min(CONFIG.WORLD_WIDTH - CONFIG.CANVAS_WIDTH, GameState.camera.x));
  GameState.camera.y = Math.max(0, Math.min(CONFIG.WORLD_HEIGHT - CONFIG.CANVAS_HEIGHT, GameState.camera.y));
}
