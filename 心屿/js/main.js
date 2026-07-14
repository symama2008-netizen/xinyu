let gameCanvas;

async function initGame() {
  gameCanvas = document.getElementById('game-canvas');

  // 加载地图数据
  await loadMapData();

  // 预加载所有室内场景数据
  await loadInteriorData('oldhouse');
  await loadInteriorData('bakery');
  await loadInteriorData('bookstore');
  await loadInteriorData('lighthouse');
  await loadInteriorData('diner');
  await loadInteriorData('repairshop');

  // 预加载所有 NPC 对话数据
  await loadDialogueData('waipo');
  await loadDialogueData('waigong');
  await loadDialogueData('fangjie');
  await loadDialogueData('chenbo');
  await loadDialogueData('guanye');
  await loadDialogueData('pangshu');
  await loadDialogueData('laozhou');

  initRenderer(gameCanvas);
  initInput();
  initUI();

  if (loadGame()) {
    if (GameState.flags.gameStarted && GameState.flags.openingComplete) {
      startGameLoop();
    }
  }

  window.addEventListener('beforeunload', saveGame);
}

window.addEventListener('DOMContentLoaded', initGame);
