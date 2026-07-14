const NarrationSystem = {
  queue: [],
  active: false,
  timer: null,
  element: null,
  data: [],
  triggered: {},

  async init() {
    this.element = document.getElementById('narration-bar');
    try {
      const res = await fetch('data/narrations.json');
      this.data = await res.json();
    } catch (e) {
      console.warn('旁白数据加载失败', e);
    }
  },

  trigger(triggerId) {
    if (this.triggered[triggerId]) return;
    const item = this.data.find(n => n.trigger === triggerId);
    if (item) {
      this.triggered[triggerId] = true;
      this.show(item.text, item.duration);
    }
  },

  show(text, duration = 3000) {
    if (GameState.dialogueActive) return;
    this.queue.push({ text, duration });
    if (!this.active) this.playNext();
  },

  playNext() {
    if (this.queue.length === 0) {
      this.active = false;
      return;
    }
    this.active = true;
    const { text, duration } = this.queue.shift();
    if (this.element) {
      this.element.textContent = text;
      this.element.classList.add('active');
    }
    this.timer = setTimeout(() => {
      if (this.element) {
        this.element.classList.remove('active');
      }
      setTimeout(() => this.playNext(), 500);
    }, duration);
  },

  clear() {
    this.queue = [];
    this.active = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.element) {
      this.element.classList.remove('active');
    }
  },

  reset() {
    this.triggered = {};
    this.clear();
  }
};
