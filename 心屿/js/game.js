let lastTime = 0;
let gameRunning = false;

function startGameLoop() {
  gameRunning = true;
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function gameLoop(currentTime) {
  if (!gameRunning) return;

  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;

  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
  updatePlayer(deltaTime);
  updateTime(deltaTime);
  updateItemFlyAnim(deltaTime);
  updateSleepFade(deltaTime);
  updateDayTransition(deltaTime);
  checkGameState();
}

function updateTime(deltaTime) {
  GameState.timeElapsed += deltaTime;

  if (GameState.timeElapsed >= 300) {
    GameState.timeElapsed = 0;
    advanceTimeOfDay();
  }
}

function advanceTimeOfDay() {
  const times = ['morning', 'noon', 'afternoon', 'evening', 'night'];
  const currentIndex = times.indexOf(GameState.timeOfDay);

  if (currentIndex < times.length - 1) {
    GameState.timeOfDay = times[currentIndex + 1];
  } else {
    GameState.timeOfDay = 'morning';
    advanceDay();
  }
}

function advanceDay() {
  GameState.day++;
  updateDayUI();

  if (GameState.day === 2 && !GameState.flags.day1Completed) {
    GameState.flags.day1Completed = true;
  } else if (GameState.day === 3 && !GameState.flags.day2Completed) {
    GameState.flags.day2Completed = true;
  } else if (GameState.day > 3) {
    GameState.flags.day3Completed = true;
    triggerEnding();
  }
}

function checkGameState() {
  if (!GameState.flags.openingComplete) return;

  if (GameState.day === 1 && GameState.timeOfDay === 'night' && !GameState.flags.day1Completed) {
    GameState.flags.day1Completed = true;
    startNewDay();
  }

  if (GameState.day === 2 && GameState.timeOfDay === 'night' && !GameState.flags.day2Completed) {
    GameState.flags.day2Completed = true;
    startNewDay();
  }

  if (GameState.day === 3 && GameState.timeOfDay === 'night' && !GameState.flags.day3Completed) {
    GameState.flags.day3Completed = true;
    triggerEnding();
  }
}

function startNewDay() {
  GameState.player.x = 14.5 * CONFIG.BLOCK_SIZE + 16;
  GameState.player.y = 16 * CONFIG.BLOCK_SIZE + 16;
  GameState.location = 'outdoor';
  updateDayUI();
}

function triggerEnding() {
  gameRunning = false;
  document.getElementById('ending-choice-screen').classList.add('active');
}
