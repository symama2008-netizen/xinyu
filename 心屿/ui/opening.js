const OpeningScene = {
  scenes: [
    {
      title: "城市格子间",
      text: "下午六点。城市格子间。\n\n林晚坐在角落的工位，屏幕上的光标停在最后一封邮件上。\n\n「交接文档已上传。感谢大家这三年的照顾。祝好。」\n点击发送。关掉电脑。",
      bgColor: "#2A2A3E",
      accentColor: "#FFD54F",
      elements: ["desk", "computer", "box"]
    },
    {
      title: "写字楼外",
      text: "走出写字楼。手机震动了一下。\n\n妈妈：「外婆说想你了。反正工作也没了，回来住几天吧。」\n林晚：「已经买好票了。明天到。」",
      bgColor: "#4A4A5E",
      accentColor: "#FFA07A",
      elements: ["building", "phone", "sunset"]
    },
    {
      title: "长途巴士",
      text: "车窗外城市方块飞速后退——写字楼变低矮厂房，再变连绵的绿色山坡。\n\n那种累像冬天清晨的雾。不知道从什么时候开始积累的，但一睁眼，它就在那里。",
      bgColor: "#6B5A4E",
      accentColor: "#87CEEB",
      elements: ["bus", "window", "landscape"]
    },
    {
      title: "抵达心屿",
      text: "大海出现。白色灯塔塔顶的光一闪一闪。\n\n站牌闪过：「心屿」\n\n「每个人都需要一座灯塔，哪怕只是心里的微光。」",
      bgColor: "#3A6B8E",
      accentColor: "#FFD54F",
      elements: ["sea", "lighthouse", "sign"]
    }
  ],

  currentScene: 0,
  active: false,
  canvas: null,
  ctx: null,
  animFrame: null,
  startTime: 0,
  transitionState: 'none',
  transitionStartTime: 0,
  particles: [],

  start() {
    this.active = true;
    this.currentScene = 0;
    this.transitionState = 'none';
    this.canvas = document.getElementById('opening-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.canvas.width = 800;
      this.canvas.height = 450;
    }
    this.renderScene();
    this.startAnimation();
  },

  renderScene() {
    const scene = this.scenes[this.currentScene];
    const container = document.getElementById('opening-screen');

    if (container) {
      container.style.backgroundColor = scene.bgColor;
    }

    const titleEl = document.getElementById('opening-title');
    const textEl = document.getElementById('opening-text');
    if (titleEl) titleEl.textContent = scene.title;
    if (textEl) textEl.textContent = scene.text;

    const dots = document.querySelectorAll('.opening-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === this.currentScene);
    });

    if (container) {
      container.classList.add('active');
    }
  },

  startAnimation() {
    this.startTime = Date.now();
    this.particles = [];
    this.initSceneParticles();
    this.animate();
  },

  initSceneParticles() {
    this.particles = [];
    if (this.currentScene === 1) {
      for (let i = 0; i < 8; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 1,
          alpha: Math.random() * 0.5 + 0.2,
          color: '#FFD700'
        });
      }
      this.initWindowStates();
    } else if (this.currentScene === 3) {
      for (let i = 0; i < 12; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: this.canvas.height * 0.55 + Math.random() * this.canvas.height * 0.45,
          vx: (Math.random() - 0.5) * 1,
          vy: -Math.random() * 0.5,
          size: Math.random() * 3 + 1,
          alpha: Math.random() * 0.3 + 0.1,
          color: '#FFF'
        });
      }
    }
  },

  initWindowStates() {
    this.windowStates = [];
    const winRows = 10;
    const winCols = 6;
    for (let i = 0; i < winRows; i++) {
      this.windowStates[i] = [];
      for (let j = 0; j < winCols; j++) {
        this.windowStates[i][j] = Math.random() < 0.45;
      }
    }
  },

  updateParticles() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      
      if (this.currentScene === 1) {
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
      } else if (this.currentScene === 3) {
        if (p.y < h * 0.5) p.y = h * 0.95;
      }
    }
  },

  drawParticles() {
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
      this.ctx.globalAlpha = 1;
    }
  },

  animate() {
    if (!this.active) return;
    const t = (Date.now() - this.startTime) / 1000;
    this.drawScene(t);
    this.animFrame = requestAnimationFrame(() => this.animate());
  },

  drawScene(t) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const scene = this.scenes[this.currentScene];

    ctx.clearRect(0, 0, w, h);

    switch (this.currentScene) {
      case 0:
        this.drawOfficeScene(ctx, w, h, t, scene);
        break;
      case 1:
        this.drawStreetScene(ctx, w, h, t, scene);
        break;
      case 2:
        this.drawBusScene(ctx, w, h, t, scene);
        break;
      case 3:
        this.drawArrivalScene(ctx, w, h, t, scene);
        break;
    }

    if (this.currentScene === 1 || this.currentScene === 3) {
      this.updateParticles();
      this.drawParticles();
    }

    this.drawTransitionOverlay(ctx, w, h);
  },

  drawTransitionOverlay(ctx, w, h) {
    if (this.transitionState === 'fadeout') {
      const progress = (Date.now() - this.transitionStartTime) / 500;
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, progress)})`;
      ctx.fillRect(0, 0, w, h);
    } else if (this.transitionState === 'fadein') {
      const progress = (Date.now() - this.transitionStartTime) / 500;
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0, 1 - progress)})`;
      ctx.fillRect(0, 0, w, h);
    }
  },

  drawOfficeScene(ctx, w, h, t, scene) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#2A2A3E');
    grad.addColorStop(1, '#1A1A2E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 限制所有绘图都在画布范围内，避免超框
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();

    // 右侧墙面隔板（基于画布百分比，留足边距）
    ctx.fillStyle = '#3A3A4E';
    const wallX = w * 0.55;
    const wallY = h * 0.15;
    const wallW = w * 0.32;
    const wallH = h * 0.5;
    ctx.fillRect(wallX, wallY, wallW, wallH);
    ctx.strokeStyle = '#5A5A6E';
    ctx.lineWidth = 2;
    ctx.strokeRect(wallX, wallY, wallW, wallH);
    ctx.beginPath();
    ctx.moveTo(wallX + wallW * 0.5, wallY);
    ctx.lineTo(wallX + wallW * 0.5, wallY + wallH);
    ctx.moveTo(wallX, wallY + wallH * 0.5);
    ctx.lineTo(wallX + wallW, wallY + wallH * 0.5);
    ctx.stroke();

    // 墙上的便利贴（限制在墙内）
    ctx.fillStyle = 'rgba(255, 213, 79, 0.3)';
    for (let i = 0; i < 5; i++) {
      const sx = wallX + wallW * 0.08 + (i % 2) * wallW * 0.18;
      const sy = wallY + wallH * 0.12 + Math.floor(i / 2) * wallH * 0.25;
      ctx.fillRect(sx, sy, wallW * 0.12, wallH * 0.12);
    }

    // 左侧办公桌
    const deskX = w * 0.05;
    const deskY = h * 0.6;
    const deskW = Math.min(w * 0.45, wallX - deskX - w * 0.05);
    const deskH = h * 0.25;
    ctx.fillStyle = '#5D4E37';
    ctx.fillRect(deskX, deskY, deskW, deskH);
    ctx.fillStyle = '#4A3F2E';
    ctx.fillRect(deskX, deskY, deskW, 8);

    // 电脑显示器（限制在桌子范围内）
    const monitorW = deskW * 0.55;
    const monitorH = deskH * 0.7;
    const monitorX = deskX + deskW * 0.12;
    const monitorY = deskY - monitorH + 12;
    const monitorGlow = 0.5 + Math.sin(t * 2) * 0.1;
    ctx.fillStyle = '#2A2A2A';
    ctx.fillRect(monitorX, monitorY, monitorW, monitorH);
    ctx.fillStyle = `rgba(135, 206, 250, ${monitorGlow})`;
    ctx.fillRect(monitorX + monitorW * 0.05, monitorY + monitorH * 0.05, monitorW * 0.9, monitorH * 0.85);
    ctx.fillStyle = '#3A3A3A';
    ctx.fillRect(monitorX + monitorW * 0.4, deskY - 6, monitorW * 0.2, 8);

    ctx.fillStyle = `rgba(255, 255, 255, ${monitorGlow * 0.8})`;
    ctx.fillRect(monitorX + monitorW * 0.15, monitorY + monitorH * 0.22, monitorW * 0.35, 3);
    ctx.fillRect(monitorX + monitorW * 0.15, monitorY + monitorH * 0.42, monitorW * 0.45, 3);
    ctx.fillRect(monitorX + monitorW * 0.15, monitorY + monitorH * 0.62, monitorW * 0.4, 3);

    // 文件盒
    const boxX = deskX + deskW * 0.72;
    const boxY = deskY + deskH * 0.18;
    const boxW = deskW * 0.22;
    const boxH = deskH * 0.5;
    ctx.fillStyle = '#D2B48C';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#A0856C';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + boxH * 0.5);
    ctx.lineTo(boxX + boxW, boxY + boxH * 0.5);
    ctx.moveTo(boxX + boxW * 0.5, boxY);
    ctx.lineTo(boxX + boxW * 0.5, boxY + boxH);
    ctx.stroke();

    ctx.restore();
  },

  drawStreetScene(ctx, w, h, t, scene) {
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(0, 0, w, h);

    const buildX = w * 0.35;
    const buildY = h * 0.15;
    const buildW = w * 0.3;
    const buildH = h * 0.7;

    ctx.fillStyle = '#2A2A3E';
    ctx.fillRect(buildX, buildY, buildW, buildH);

    const winRows = 10;
    const winCols = 6;
    const winMarginX = buildW * 0.1;
    const winMarginY = buildH * 0.08;
    const winW = (buildW - winMarginX * 2) / winCols;
    const winH = (buildH - winMarginY * 2) / winRows;

    for (let i = 0; i < winRows; i++) {
      for (let j = 0; j < winCols; j++) {
        const isLit = this.windowStates && this.windowStates[i] && this.windowStates[i][j];
        const wx = buildX + winMarginX + j * winW + 2;
        const wy = buildY + winMarginY + i * winH + 2;
        if (isLit) {
          ctx.fillStyle = '#FFE4B5';
        } else {
          ctx.fillStyle = '#1A1A2E';
        }
        ctx.fillRect(wx, wy, winW - 4, winH - 4);
      }
    }

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, w, h);
  },

  drawBusScene(ctx, w, h, t, scene) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(0.6, '#B0E0E6');
    grad.addColorStop(1, '#90EE90');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#6B8E6B';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.6);
    for (let i = 0; i <= 10; i++) {
      const x = (w / 10) * i;
      const y = h * 0.6 - Math.sin(i * 0.8 + t * 0.1) * 30 - 30;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#4A7C4A';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.75);
    for (let i = 0; i <= 8; i++) {
      const x = (w / 8) * i;
      const y = h * 0.75 - Math.sin(i * 1.2 + t * 0.15) * 20 - 15;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#696969';
    ctx.fillRect(0, h * 0.85, w, h * 0.15);
    ctx.fillStyle = '#FFD54F';
    for (let i = 0; i < 10; i++) {
      const offset = (t * 100 + i * 100) % (w + 80) - 40;
      ctx.fillRect(offset, h * 0.92, 40, 4);
    }

    const busX = w * 0.3 + Math.sin(t * 0.5) * 3;
    const busY = h * 0.68;

    ctx.fillStyle = '#FFA07A';
    ctx.fillRect(busX, busY, w * 0.35, h * 0.18);
    ctx.fillStyle = '#FF7F50';
    ctx.fillRect(busX, busY, w * 0.35, h * 0.04);

    ctx.fillStyle = '#87CEEB';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(busX + 15 + i * (w * 0.08), busY + 10, w * 0.06, h * 0.07);
    }

    ctx.fillStyle = '#2A2A2A';
    ctx.beginPath();
    ctx.arc(busX + 30, busY + h * 0.18, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(busX + w * 0.3 - 30, busY + h * 0.18, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5A4A3A';
    ctx.beginPath();
    ctx.arc(busX + w * 0.12, busY + h * 0.06, 6, 0, Math.PI * 2);
    ctx.fill();
  },

  drawArrivalScene(ctx, w, h, t, scene) {
    const grad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    grad.addColorStop(0, '#FFD5B0');
    grad.addColorStop(1, '#FFE4B5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h * 0.6);

    ctx.fillStyle = '#3A7BD5';
    ctx.fillRect(0, h * 0.6, w, h * 0.4);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < 4; i++) {
      const waveY = h * 0.65 + i * 25;
      ctx.beginPath();
      ctx.moveTo(0, waveY);
      for (let j = 0; j < 20; j++) {
        const wx = (j * 50 + t * 15) % w;
        const wy = waveY + Math.sin(j * 0.5 + t) * 4;
        ctx.lineTo(wx, wy);
      }
      ctx.lineTo(w, waveY + 8);
      ctx.lineTo(0, waveY + 8);
      ctx.closePath();
      ctx.fill();
    }

    const islandX = w * 0.6;
    const islandY = h * 0.55;
    const islandW = w * 0.35;
    const islandH = h * 0.12;

    ctx.fillStyle = '#7EC87B';
    ctx.beginPath();
    ctx.ellipse(islandX, islandY + islandH, islandW, islandH, 0, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#5DA85A';
    ctx.beginPath();
    ctx.ellipse(islandX, islandY + islandH + 5, islandW * 0.9, islandH * 0.6, 0, Math.PI, 0);
    ctx.fill();

    const lighthouseX = islandX;
    const lighthouseY = islandY - h * 0.2;
    const lighthouseW = w * 0.08;
    const lighthouseH = h * 0.3;

    ctx.fillStyle = '#ECEFF1';
    ctx.fillRect(lighthouseX - lighthouseW / 2, lighthouseY, lighthouseW, lighthouseH);

    ctx.fillStyle = '#E57373';
    ctx.beginPath();
    ctx.moveTo(lighthouseX - lighthouseW / 2 - 4, lighthouseY);
    ctx.lineTo(lighthouseX, lighthouseY - h * 0.08);
    ctx.lineTo(lighthouseX + lighthouseW / 2 + 4, lighthouseY);
    ctx.closePath();
    ctx.fill();

    const beamAngle = t * 0.6;
    ctx.save();
    ctx.translate(lighthouseX, lighthouseY - h * 0.04);
    ctx.rotate(beamAngle);
    const beamGrad = ctx.createLinearGradient(0, 0, w * 0.2, 0);
    beamGrad.addColorStop(0, 'rgba(255, 255, 200, 0.3)');
    beamGrad.addColorStop(1, 'rgba(255, 255, 200, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(w * 0.25, -25);
    ctx.lineTo(w * 0.25, 25);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#FFD54F';
    ctx.beginPath();
    ctx.arc(lighthouseX, lighthouseY - h * 0.04, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFF';
    ctx.globalAlpha = 0.9;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('「心屿」', w / 2, h * 0.88);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  },

  next() {
    if (this.transitionState !== 'none') return;
    
    this.transitionState = 'fadeout';
    this.transitionStartTime = Date.now();
    
    setTimeout(() => {
      this.currentScene++;
      if (this.currentScene >= this.scenes.length) {
        this.end();
      } else {
        this.transitionState = 'fadein';
        this.transitionStartTime = Date.now();
        this.startTime = Date.now();
        this.initSceneParticles();
        this.renderScene();
        
        setTimeout(() => {
          this.transitionState = 'none';
        }, 500);
      }
    }, 500);
  },

  skip() {
    this.end();
  },

  end() {
    this.active = false;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    const screen = document.getElementById('opening-screen');
    if (screen) {
      screen.classList.remove('active');
    }
    GameState.flags.openingComplete = true;
    if (typeof startGameLoop === 'function') {
      startGameLoop();
    }
    if (typeof NarrationSystem !== 'undefined') {
      NarrationSystem.trigger('game_start');
    }
  }
};