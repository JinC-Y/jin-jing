/* ========================================
   安慰收尾特效：爱心 + 烟花
   安慰弹幕结束后播放，给情绪一个温暖的落点
   ======================================== */

const ComfortFinale = {
  canvasId: 'comfort-finale',
  canvas: null,
  ctx: null,
  dpr: 1,

  heart: [],
  sparks: [],
  bursts: [],

  raf: null,
  startTime: 0,
  token: 0,
  active: false,
  _skipHandler: null,

  // 时间轴（毫秒）
  CONVERGE: 1050,     // 粒子汇聚成爱心
  PULSE_FROM: 1050,   // 开始心跳
  FIREWORKS: [900, 1500, 2100, 2700],  // 烟花绽放时刻
  FADE_FROM: 3400,
  DURATION: 4400,

  heartColors: ['#FF6B8A', '#FF4D6D', '#FF8FA3', '#FFB3C6', '#FF7A9C', '#FFD1DC'],
  sparkColors: ['#FFD166', '#FF9F1C', '#FF6B8A', '#A78BFA', '#7ED8F0', '#FFB3C6', '#FFE066'],

  // 精灵图缓存（每种颜色一张，避免逐帧画渐变）
  _sprites: {},

  /**
   * 播放特效
   */
  play() {
    const canvas = document.getElementById(this.canvasId);
    if (!canvas) return false;

    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    this.canvas = canvas;
    this.ctx = ctx;

    // 高清适配
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * this.dpr);
    canvas.height = Math.floor(h * this.dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const token = ++this.token;
    this.active = true;
    this.sparks = [];
    this.bursts = [];

    this._buildHeart(w, h);
    this._scheduleFireworks(w, h);
    this._bindSkip(token);

    canvas.classList.add('active');

    this.startTime = performance.now();
    this._loop(token);

    return true;
  },

  /**
   * 采样爱心形状（参数方程）
   */
  _buildHeart(w, h) {
    const isNarrow = w < 640;
    const outlineCount = isNarrow ? 92 : 132;
    const innerCount = isNarrow ? 66 : 102;

    // 爱心大小随屏幕缩放
    const size = Math.min(w * 0.34, h * 0.30);
    const cx = w / 2;
    const cy = h / 2 + size * 0.06;

    const list = [];

    // —— 轮廓 ——
    for (let i = 0; i < outlineCount; i++) {
      const t = (i / outlineCount) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t)
        - 5 * Math.cos(2 * t)
        - 2 * Math.cos(3 * t)
        - Math.cos(4 * t));
      list.push({
        rx: (x / 17) * size,
        ry: (y / 17) * size,
        size: 2.6 + Math.random() * 2.2,
        color: this.heartColors[Math.floor(Math.random() * this.heartColors.length)]
      });
    }

    // —— 内部填充 ——
    for (let i = 0; i < innerCount; i++) {
      const t = Math.random() * Math.PI * 2;
      const k = 0.30 + Math.random() * 0.62;   // 径向收缩，避免糊成一团
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t)
        - 5 * Math.cos(2 * t)
        - 2 * Math.cos(3 * t)
        - Math.cos(4 * t));
      list.push({
        rx: (x / 17) * size * k,
        ry: (y / 17) * size * k,
        size: 1.6 + Math.random() * 1.8,
        color: this.heartColors[Math.floor(Math.random() * this.heartColors.length)]
      });
    }

    // 起点：从四周散落到爱心周围，形成汇聚感
    const total = list.length;
    list.forEach((p, i) => {
      const ang = Math.random() * Math.PI * 2;
      const dist = size * (1.6 + Math.random() * 2.4);
      p.sx = cx + Math.cos(ang) * dist;
      p.sy = cy + Math.sin(ang) * dist * 0.7;
      p.delay = (i / total) * 620 + Math.random() * 220;
    });

    this.heart = list;
    this.heartCx = cx;
    this.heartCy = cy;
  },

  /**
   * 排布烟花绽放
   */
  _scheduleFireworks(w, h) {
    const size = Math.min(w * 0.34, h * 0.30);

    this.FIREWORKS.forEach((at, i) => {
      // 环绕爱心随机分布，避开正中心
      const side = i % 2 === 0 ? -1 : 1;
      const ang = Math.random() * Math.PI * 0.9;
      this.bursts.push({
        at,
        x: w / 2 + side * (size * (0.95 + Math.random() * 0.75)),
        y: h / 2 + (Math.random() - 0.5) * size * 1.35,
        fired: false,
        count: w < 640 ? 34 : 50
      });
    });
  },

  /**
   * 主循环
   */
  _loop(token) {
    if (!this.active || token !== this.token) return;

    const now = performance.now();
    const t = now - this.startTime;

    this._draw(t);

    if (t < this.DURATION) {
      this.raf = requestAnimationFrame(() => this._loop(token));
    } else {
      this.stop();
    }
  },

  /**
   * 绘制一帧
   */
  _draw(t) {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    // 整体淡出
    let global = 1;
    if (t > this.FADE_FROM) {
      global = Math.max(0, 1 - (t - this.FADE_FROM) / (this.DURATION - this.FADE_FROM));
    }

    // 心跳缩放
    let pulse = 1;
    if (t > this.PULSE_FROM) {
      const p = (t - this.PULSE_FROM) / 1000;
      pulse = 1 + Math.sin(p * Math.PI * 2 * 1.15) * 0.045;
    }

    ctx.save();
    ctx.globalAlpha = global;

    // ---- 爱心粒子（普通混合，避免密集叠色过曝成白块） ----
    ctx.globalCompositeOperation = 'source-over';
    this.heart.forEach(p => {
      const local = Math.max(0, Math.min(1, (t - p.delay) / this.CONVERGE));
      if (local <= 0) return;

      const e = 1 - Math.pow(1 - local, 3);   // easeOutCubic
      const tx = this.heartCx + p.rx * pulse;
      const ty = this.heartCy + p.ry * pulse;
      const x = p.sx + (tx - p.sx) * e;
      const y = p.sy + (ty - p.sy) * e;

      // 汇聚过程中稍微大一点，落位后收拢
      const r = p.size * (1 + (1 - e) * 0.9);
      this._dot(x, y, r, p.color, 0.92);
    });

    // ---- 烟花（叠加发光，炸开时有闪亮感） ----
    ctx.globalCompositeOperation = 'lighter';

    this.bursts.forEach(b => {
      if (!b.fired && t >= b.at) {
        b.fired = true;
        this._burst(b);
      }
    });

    this.sparks.forEach(s => {
      const age = (t - s.born) / 1000;
      if (age < 0 || age > s.life) return;

      const k = age / s.life;
      const x = s.x + s.vx * age;
      const y = s.y + s.vy * age + 0.5 * s.g * age * age;
      const alpha = Math.max(0, 1 - k) * (1 - k * 0.25);
      const r = s.size * (1 - k * 0.55);

      ctx.globalAlpha = global * alpha;
      this._dot(x, y, r, s.color, 1);
      ctx.globalAlpha = global;
    });

    ctx.restore();
  },

  /**
   * 生成一簇烟花
   */
  _burst(b) {
    const now = performance.now();
    for (let i = 0; i < b.count; i++) {
      const ang = (i / b.count) * Math.PI * 2 + Math.random() * 0.28;
      const speed = 110 + Math.random() * 190;
      this.sparks.push({
        x: b.x,
        y: b.y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        g: 150 + Math.random() * 90,
        size: 1.8 + Math.random() * 2.4,
        life: 0.85 + Math.random() * 0.75,
        born: now,
        color: this.sparkColors[Math.floor(Math.random() * this.sparkColors.length)]
      });
    }
    // 清理过期火花
    if (this.sparks.length > 900) {
      this.sparks = this.sparks.filter(s => (now - s.born) / 1000 < s.life);
    }
  },

  /**
   * 画一个发光点（用缓存的精灵图，比逐帧画渐变快很多）
   */
  _dot(x, y, r, color, alpha) {
    const sprite = this._sprite(color);
    const ctx = this.ctx;
    const prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * alpha;
    ctx.drawImage(sprite, x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2);
    ctx.globalAlpha = prev;
  },

  /**
   * 颜色 → 发光点精灵图
   */
  _sprite(color) {
    if (this._sprites[color]) return this._sprites[color];

    const size = 64;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d');
    if (!g) return c;

    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, color);
    grad.addColorStop(0.28, color);
    grad.addColorStop(1, 'rgba(255,255,255,0)');

    g.fillStyle = grad;
    g.beginPath();
    g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    g.fill();

    this._sprites[color] = c;
    return c;
  },

  /**
   * 点击跳过
   */
  _bindSkip(token) {
    if (this._skipHandler) {
      this.canvas.removeEventListener('click', this._skipHandler);
    }
    const shownAt = Date.now();
    this._skipHandler = () => {
      if (Date.now() - shownAt < 260) return;   // 忽略关闭安慰弹幕的那一次点击
      this.stop();
    };
    this.canvas.addEventListener('click', this._skipHandler);
  },

  /**
   * 停止并清理
   */
  stop() {
    this.active = false;
    this.token++;

    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }

    if (this.canvas) {
      if (this._skipHandler) {
        this.canvas.removeEventListener('click', this._skipHandler);
        this._skipHandler = null;
      }
      this.canvas.classList.remove('active');
      const ctx = this.ctx;
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }

    this.heart = [];
    this.sparks = [];
    this.bursts = [];
  },

  isActive() {
    return this.active;
  }
};
