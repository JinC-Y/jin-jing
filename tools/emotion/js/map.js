/* ========================================
   校园地图渲染模块 - 情绪地图（手绘卡通风格）
   负责地图绘制、地点渲染、热力图效果
   ======================================== */

const CampusMap = {
  canvas: null,
  ctx: null,
  container: null,
  locations: [],
  emotions: [],
  selectedLocation: null,
  isDragging: false,
  dragLocation: null,
  dragOffset: { x: 0, y: 0 },

  // 视图变换（缩放/平移）
  view: { scale: 1, x: 0, y: 0 },
  minScale: 0.6,
  maxScale: 3,
  isPanning: false,
  panStartScreen: { x: 0, y: 0 },
  panStartView: { x: 0, y: 0 },
  movedDuringDrag: false,
  // 双指缩放
  pinchStartDist: 0,
  pinchStartScale: 1,

  // 地图配置
  config: {
    width: 900,
    height: 700,
    locationRadius: 38
  },

  // 心情图片缓存
  moodImages: {},
  moodImagesLoaded: false,

  // 卡通配色
  colors: {
    bg: '#FDF6EC',           // 奶油色背景
    road: '#F0DFB4',         // 米黄道路
    roadLine: '#E8D5A0',     // 道路边线
    grass: '#C5E8B0',        // 浅绿草地
    grassDark: '#A8D98A',    // 深绿草地
    water: '#A8D8F0',        // 湖水蓝
    waterLight: '#C5E8FA',   // 浅湖水
    tree: '#7AB86A',         // 树木绿
    treeDark: '#5A9A4A',     // 深树绿
    treeTrunk: '#C49A6C',    // 树干棕
    label: '#5A4A3A',        // 标签文字
    labelBg: '#FFFFFF',      // 标签背景
    moodHappy: '#51CF66',
    moodCalm: '#4A90D9',
    moodNeutral: '#FFD43B',
    moodAnxious: '#FF922B',
    moodSad: '#FF6B6B'
  },

  // 预设地点（位置重新规划为更自然的校园布局）
  presetLocations: [
    { id: 'loc_gate',     name: '校门',     x: 450, y: 620, icon: '🏫', isPreset: true, desc: '梦想的起点' },
    { id: 'loc_library',  name: '图书馆',   x: 450, y: 380, icon: '📖', isPreset: true, desc: '静谧书海' },
    { id: 'loc_teaching', name: '教学楼',   x: 320, y: 220, icon: '📚', isPreset: true, desc: '知识的殿堂' },
    { id: 'loc_canteen',  name: '食堂',     x: 650, y: 180, icon: '🍜', isPreset: true, desc: '美食的天堂' },
    { id: 'loc_dorm',     name: '寝室',     x: 700, y: 420, icon: '🏠', isPreset: true, desc: '温馨的小窝' },
    { id: 'loc_gym',      name: '体育馆',   x: 150, y: 430, icon: '🏀', isPreset: true, desc: '挥洒汗水' },
    { id: 'loc_playground', name: '操场',   x: 160, y: 260, icon: '🏃', isPreset: true, desc: '奔跑吧青春' },
    { id: 'loc_lab',      name: '实验室',   x: 420, y: 130, icon: '🔬', isPreset: true, desc: '探索未知' },
    { id: 'loc_park',     name: '小花园',   x: 600, y: 550, icon: '🌸', isPreset: true, desc: '静享花开' },
    { id: 'loc_lake',     name: '学子湖',   x: 270, y: 520, icon: '🐟', isPreset: true, desc: '湖光潋滟' }
  ],

  // 装饰物（树木、花草、小动物等）
  decorations: [
    // 树木
    { type: 'tree', x: 80,  y: 120, size: 18 },
    { type: 'tree', x: 130, y: 150, size: 22 },
    { type: 'tree', x: 50,  y: 300, size: 16 },
    { type: 'tree', x: 780, y: 100, size: 20 },
    { type: 'tree', x: 800, y: 300, size: 18 },
    { type: 'tree', x: 50,  y: 550, size: 14 },
    { type: 'tree', x: 820, y: 550, size: 16 },
    { type: 'tree', x: 350, y: 640, size: 14 },
    { type: 'tree', x: 560, y: 640, size: 16 },
    { type: 'tree', x: 750, y: 280, size: 14 },
    // 灌木丛
    { type: 'bush', x: 100, y: 480, size: 14 },
    { type: 'bush', x: 750, y: 520, size: 12 },
    { type: 'bush', x: 380, y: 480, size: 10 },
    { type: 'bush', x: 530, y: 280, size: 12 },
    // 小花
    { type: 'flower', x: 120, y: 600, size: 6 },
    { type: 'flower', x: 780, y: 600, size: 6 },
    { type: 'flower', x: 350, y: 560, size: 5 },
    { type: 'flower', x: 560, y: 560, size: 5 },
    // 小动物
    { type: 'cat', x: 830, y: 180, size: 14 },
    { type: 'bird', x: 100, y: 80, size: 10 }
  ],

  /**
   * 初始化地图
   */
  init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('地图容器未找到:', containerId);
      return;
    }

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    this.canvas.style.cursor = 'pointer';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    if (!this.ctx) {
      console.error('Canvas 2D 上下文获取失败');
      return;
    }

    this.loadData();
    this.loadMoodImages();
    this.bindEvents();
    this.renderLegend();
    this.render();

    console.log('✅ 地图初始化完成，尺寸:', this.canvas.width, 'x', this.canvas.height, '地点数:', this.locations.length);
  },

  loadData() {
    const customLocations = StorageManager.load('emotion_custom_locations') || [];
    this.locations = [...this.presetLocations, ...customLocations];
    this.emotions = StorageManager.load('emotion_records') || [];
  },

  /**
   * 预加载心情图片
   */
  loadMoodImages() {
    const moodList = [
      { level: 5, src: 'assets/happy.png' },
      { level: 4, src: 'assets/calm.png' },
      { level: 3, src: 'assets/nutral.png' },
      { level: 2, src: 'assets/anxious.png' },
      { level: 1, src: 'assets/sad.png' }
    ];
    let loaded = 0;
    moodList.forEach(mood => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        if (loaded === moodList.length) {
          this.moodImagesLoaded = true;
          this.render();
        }
      };
      img.src = mood.src;
      this.moodImages[mood.level] = img;
    });
  },

  bindEvents() {
    // 鼠标事件
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseup', (e) => this.handleMouseUp(e));

    // 滚轮缩放
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

    // 触摸事件（移动端）
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));

    // 缩放控制按钮
    const zoomIn = document.getElementById('map-zoom-in');
    const zoomOut = document.getElementById('map-zoom-out');
    const zoomReset = document.getElementById('map-zoom-reset');
    if (zoomIn) zoomIn.addEventListener('click', () => this.zoomBy(1.25));
    if (zoomOut) zoomOut.addEventListener('click', () => this.zoomBy(0.8));
    if (zoomReset) zoomReset.addEventListener('click', () => this.resetView());

    // 图例折叠
    const legendToggle = document.getElementById('legend-toggle');
    if (legendToggle) {
      legendToggle.addEventListener('click', () => {
        const panel = document.getElementById('map-legend');
        if (panel) panel.classList.toggle('collapsed');
      });
    }
  },

  /**
   * 获取鼠标在画布上的像素坐标
   */
  getScreenPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
    };
  },

  /**
   * 屏幕坐标 → 世界坐标
   */
  screenToWorld(p) {
    return {
      x: (p.x - this.view.x) / this.view.scale,
      y: (p.y - this.view.y) / this.view.scale
    };
  },

  /**
   * 获取鼠标的世界坐标
   */
  getMousePos(e) {
    return this.screenToWorld(this.getScreenPos(e));
  },

  /**
   * 以某个屏幕点为锚点缩放
   */
  zoomAt(screenX, screenY, factor) {
    const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.view.scale * factor));
    const k = newScale / this.view.scale;
    this.view.x = screenX - (screenX - this.view.x) * k;
    this.view.y = screenY - (screenY - this.view.y) * k;
    this.view.scale = newScale;
    this.clampView();
    this.render();
  },

  /**
   * 以画布中心缩放
   */
  zoomBy(factor) {
    this.zoomAt(this.config.width / 2, this.config.height / 2, factor);
  },

  /**
   * 重置视图
   */
  resetView() {
    this.view = { scale: 1, x: 0, y: 0 };
    this.render();
  },

  /**
   * 限制平移范围，避免地图完全移出视野
   */
  clampView() {
    const w = this.config.width;
    const h = this.config.height;
    const s = this.view.scale;
    const scaledW = w * s;
    const scaledH = h * s;

    // 至少保留 25% 的地图在视野内
    const minX = Math.min(0, w - scaledW) - scaledW * 0.75;
    const maxX = Math.max(0, w - scaledW) + scaledW * 0.75;
    const minY = Math.min(0, h - scaledH) - scaledH * 0.75;
    const maxY = Math.max(0, h - scaledH) + scaledH * 0.75;

    this.view.x = Math.min(maxX, Math.max(minX, this.view.x));
    this.view.y = Math.min(maxY, Math.max(minY, this.view.y));
  },

  /**
   * 滚轮缩放
   */
  handleWheel(e) {
    e.preventDefault();
    const screen = this.getScreenPos(e);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    this.zoomAt(screen.x, screen.y, factor);
  },

  /**
   * 触摸开始（支持双指缩放）
   */
  handleTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const d = this.touchDistance(e.touches);
      this.pinchStartDist = d;
      this.pinchStartScale = this.view.scale;
      this.isPanning = false;
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const screen = this.getScreenPos({ clientX: touch.clientX, clientY: touch.clientY });
      const world = this.screenToWorld(screen);
      const loc = this.findLocationAt(world.x, world.y);

      if (loc && !loc.isPreset) {
        this.isDragging = true;
        this.dragLocation = loc;
        this.dragOffset = { x: world.x - loc.x, y: world.y - loc.y };
      } else {
        this.isPanning = true;
        this.movedDuringDrag = false;
        this.panStartScreen = screen;
        this.panStartView = { x: this.view.x, y: this.view.y };
      }
    }
  },

  /**
   * 触摸移动
   */
  handleTouchMove(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const d = this.touchDistance(e.touches);
      if (this.pinchStartDist > 0) {
        const ratio = d / this.pinchStartDist;
        const targetScale = Math.min(this.maxScale, Math.max(this.minScale, this.pinchStartScale * ratio));
        const factor = targetScale / this.view.scale;
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const screen = this.getScreenPos({ clientX: cx, clientY: cy });
        this.zoomAt(screen.x, screen.y, factor);
      }
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const screen = this.getScreenPos({ clientX: touch.clientX, clientY: touch.clientY });

      if (this.isDragging && this.dragLocation) {
        e.preventDefault();
        const world = this.screenToWorld(screen);
        this.dragLocation.x = world.x - this.dragOffset.x;
        this.dragLocation.y = world.y - this.dragOffset.y;
        this.render();
      } else if (this.isPanning) {
        e.preventDefault();
        this.movedDuringDrag = true;
        this.view.x = this.panStartView.x + (screen.x - this.panStartScreen.x);
        this.view.y = this.panStartView.y + (screen.y - this.panStartScreen.y);
        this.clampView();
        this.render();
      }
    }
  },

  /**
   * 触摸结束
   */
  handleTouchEnd(e) {
    if (this.isDragging && this.dragLocation) {
      this.saveCustomLocations();
      this.isDragging = false;
      this.dragLocation = null;
    }
    if (e.touches.length === 0) {
      this.isPanning = false;
      this.pinchStartDist = 0;
    }
  },

  /**
   * 计算两个触点的距离
   */
  touchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  },

  findLocationAt(x, y) {
    for (let i = this.locations.length - 1; i >= 0; i--) {
      const loc = this.locations[i];
      const dist = Math.sqrt((x - loc.x) ** 2 + (y - loc.y) ** 2);
      if (dist <= this.config.locationRadius + 8) {
        return loc;
      }
    }
    return null;
  },

  handleClick(e) {
    // 拖拽或平移结束时不触发选择
    if (this.movedDuringDrag || this.isDragging) {
      this.movedDuringDrag = false;
      return;
    }
    const pos = this.getMousePos(e);
    const loc = this.findLocationAt(pos.x, pos.y);
    if (loc) {
      this.selectedLocation = loc;
      const event = new CustomEvent('locationSelected', { detail: loc });
      document.dispatchEvent(event);
      this.render();
    }
  },

  handleDoubleClick(e) {
    const pos = this.getMousePos(e);
    const loc = this.findLocationAt(pos.x, pos.y);
    if (loc && !loc.isPreset) {
      const event = new CustomEvent('editCustomLocation', { detail: loc });
      document.dispatchEvent(event);
    }
  },

  handleMouseDown(e) {
    const screen = this.getScreenPos(e);
    const pos = this.screenToWorld(screen);
    const loc = this.findLocationAt(pos.x, pos.y);

    if (loc && !loc.isPreset) {
      // 拖动自定义地点
      this.isDragging = true;
      this.dragLocation = loc;
      this.dragOffset = { x: pos.x - loc.x, y: pos.y - loc.y };
      this.canvas.style.cursor = 'grabbing';
    } else {
      // 平移地图
      this.isPanning = true;
      this.movedDuringDrag = false;
      this.panStartScreen = screen;
      this.panStartView = { x: this.view.x, y: this.view.y };
      this.canvas.style.cursor = 'grab';
    }
  },

  handleMouseMove(e) {
    if (this.isDragging && this.dragLocation) {
      const pos = this.getMousePos(e);
      this.dragLocation.x = pos.x - this.dragOffset.x;
      this.dragLocation.y = pos.y - this.dragOffset.y;
      this.render();
      return;
    }

    if (this.isPanning) {
      const screen = this.getScreenPos(e);
      const dx = screen.x - this.panStartScreen.x;
      const dy = screen.y - this.panStartScreen.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        this.movedDuringDrag = true;
      }
      this.view.x = this.panStartView.x + dx;
      this.view.y = this.panStartView.y + dy;
      this.clampView();
      this.render();
    }
  },

  handleMouseUp() {
    if (this.isDragging && this.dragLocation) {
      this.saveCustomLocations();
      this.render();
    }
    this.isDragging = false;
    this.dragLocation = null;
    this.isPanning = false;
    this.canvas.style.cursor = 'grab';
  },

  saveCustomLocations() {
    const customLocations = this.locations.filter(l => !l.isPreset);
    StorageManager.save('emotion_custom_locations', customLocations);
  },

  getLocationMoodColor(locId) {
    const records = this.emotions.filter(e => e.locationId === locId);
    if (records.length === 0) return null;
    const now = typeof MockDate !== 'undefined' ? MockDate.now() : Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentRecords = records.filter(r => r.timestamp > weekAgo);
    if (recentRecords.length === 0) return null;
    const avg = recentRecords.reduce((sum, r) => sum + r.mood, 0) / recentRecords.length;
    if (avg >= 4.5) return this.colors.moodHappy;
    if (avg >= 3.5) return this.colors.moodCalm;
    if (avg >= 2.5) return this.colors.moodNeutral;
    if (avg >= 1.5) return this.colors.moodAnxious;
    return this.colors.moodSad;
  },

  getLocationWeather(locId) {
    const records = this.emotions.filter(e => e.locationId === locId);
    if (records.length === 0) return '';
    const now = typeof MockDate !== 'undefined' ? MockDate.now() : Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentRecords = records.filter(r => r.timestamp > weekAgo);
    if (recentRecords.length === 0) return '';
    const avg = recentRecords.reduce((sum, r) => sum + r.mood, 0) / recentRecords.length;
    if (avg >= 4.5) return '☀️';
    if (avg >= 3.5) return '⛅';
    if (avg >= 2.5) return '🌤️';
    if (avg >= 1.5) return '🌧️';
    return '⛈️';
  },

  /**
   * 获取地点当前心情等级（用于显示对应图片）
   */
  getLocationMoodLevel(locId) {
    const records = this.emotions.filter(e => e.locationId === locId);
    if (records.length === 0) return null;
    const now = typeof MockDate !== 'undefined' ? MockDate.now() : Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentRecords = records.filter(r => r.timestamp > weekAgo);
    if (recentRecords.length === 0) return null;
    const avg = recentRecords.reduce((sum, r) => sum + r.mood, 0) / recentRecords.length;
    if (avg >= 4.5) return 5;
    if (avg >= 3.5) return 4;
    if (avg >= 2.5) return 3;
    if (avg >= 1.5) return 2;
    return 1;
  },

  // ==================== 绘制方法 ====================

  render() {
    const ctx = this.ctx;
    const w = this.config.width;
    const h = this.config.height;

    ctx.clearRect(0, 0, w, h);

    // 画布外围底色（缩放后露出的区域）
    ctx.fillStyle = '#EFE9DD';
    ctx.fillRect(0, 0, w, h);

    // ---- 应用视图变换（世界坐标层） ----
    ctx.save();
    ctx.translate(this.view.x, this.view.y);
    ctx.scale(this.view.scale, this.view.scale);

    // 1. 奶油色背景
    this.drawBackground(ctx, w, h);
    // 2. 草地区域
    this.drawGrassAreas(ctx);
    // 3. 道路
    this.drawRoads(ctx, w, h);
    // 4. 湖泊
    this.drawLake(ctx);
    // 5. 装饰物（树、花、动物）
    this.drawDecorations(ctx);
    // 6. 地点
    this.locations.forEach(loc => this.drawLocation(ctx, loc));

    ctx.restore();
  },

  /**
   * 渲染 HTML 图例
   */
  renderLegend() {
    const container = document.getElementById('map-legend');
    if (!container) return;

    const items = [
      { img: 'assets/happy.png',   label: '开心', color: this.colors.moodHappy },
      { img: 'assets/calm.png',    label: '平静', color: this.colors.moodCalm },
      { img: 'assets/nutral.png',  label: '一般', color: this.colors.moodNeutral },
      { img: 'assets/anxious.png', label: '焦虑', color: this.colors.moodAnxious },
      { img: 'assets/sad.png',     label: '低落', color: this.colors.moodSad }
    ];

    container.innerHTML = `
      <div class="legend-header">
        <span class="legend-title">心情图例</span>
        <button class="legend-toggle" id="legend-toggle" title="折叠/展开">▾</button>
      </div>
      <div class="legend-list">
        ${items.map(item => `
          <div class="legend-row">
            <img class="legend-row-img" src="${item.img}" alt="${item.label}">
            <span class="legend-row-label">${item.label}</span>
          </div>
        `).join('')}
      </div>
    `;

    // 重新绑定折叠事件
    const toggle = container.querySelector('#legend-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        container.classList.toggle('collapsed');
      });
    }
  },

  /**
   * 奶油色背景 + 微妙纹理
   */
  drawBackground(ctx, w, h) {
    // 主背景
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, 0, w, h);

    // 微妙的网格纹理
    ctx.strokeStyle = 'rgba(0,0,0,0.015)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  },

  /**
   * 绘制草地区域（圆润的有机形状）
   */
  drawGrassAreas(ctx) {
    const grassAreas = [
      { x: 80,  y: 180, rx: 70, ry: 50 },
      { x: 780, y: 160, rx: 60, ry: 45 },
      { x: 60,  y: 420, rx: 55, ry: 40 },
      { x: 800, y: 450, rx: 50, ry: 35 },
      { x: 200, y: 600, rx: 80, ry: 40 },
      { x: 700, y: 600, rx: 70, ry: 35 }
    ];

    grassAreas.forEach(area => {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = this.colors.grass;
      ctx.beginPath();
      ctx.ellipse(area.x, area.y, area.rx, area.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  },

  /**
   * 绘制道路（温暖的米黄色带状路）
   */
  drawRoads(ctx, w, h) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 横向主路（从校门往上的主干道）
    this.drawSmoothRoad(ctx, [
      { x: 50, y: 400 },
      { x: 200, y: 390 },
      { x: 450, y: 380 },
      { x: 700, y: 390 },
      { x: 860, y: 400 }
    ], 28);

    // 纵向主路（从校门到实验室）
    this.drawSmoothRoad(ctx, [
      { x: 450, y: 660 },
      { x: 450, y: 550 },
      { x: 450, y: 400 },
      { x: 450, y: 250 },
      { x: 450, y: 100 }
    ], 28);

    // 左侧支路
    this.drawSmoothRoad(ctx, [
      { x: 200, y: 390 },
      { x: 180, y: 300 },
      { x: 160, y: 200 }
    ], 18);

    // 右侧支路
    this.drawSmoothRoad(ctx, [
      { x: 700, y: 390 },
      { x: 680, y: 300 },
      { x: 660, y: 200 }
    ], 18);

    // 上方横路
    this.drawSmoothRoad(ctx, [
      { x: 160, y: 180 },
      { x: 300, y: 170 },
      { x: 450, y: 160 },
      { x: 600, y: 170 },
      { x: 700, y: 180 }
    ], 16);

    // 下方支路（通往寝室区）
    this.drawSmoothRoad(ctx, [
      { x: 700, y: 390 },
      { x: 720, y: 450 },
      { x: 700, y: 520 }
    ], 16);

    // 左下支路（通往小花园和湖）
    this.drawSmoothRoad(ctx, [
      { x: 450, y: 550 },
      { x: 350, y: 560 },
      { x: 250, y: 550 }
    ], 16);
  },

  /**
   * 绘制平滑道路
   */
  drawSmoothRoad(ctx, points, width) {
    if (points.length < 2) return;

    // 道路阴影
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = width + 6;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y + 2);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y + 2);
    }
    ctx.stroke();
    ctx.restore();

    // 道路主体
    ctx.strokeStyle = this.colors.road;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // 道路边线（虚线）
    ctx.strokeStyle = this.colors.roadLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  },

  /**
   * 绘制学子湖（不规则有机形状）
   */
  drawLake(ctx) {
    const cx = 270, cy = 520;

    // 湖水阴影
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    ctx.ellipse(cx + 2, cy + 3, 72, 48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 湖水主体
    ctx.fillStyle = this.colors.water;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 70, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    // 湖水高光
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = this.colors.waterLight;
    ctx.beginPath();
    ctx.ellipse(cx - 15, cy - 10, 30, 18, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 荷叶
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#7AB86A';
    ctx.beginPath();
    ctx.ellipse(cx + 25, cy + 8, 8, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - 20, cy + 15, 6, 5, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 湖泊标签
    ctx.fillStyle = '#3A7BC8';
    ctx.font = 'bold 11px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('学子湖', cx, cy + 30);
  },

  /**
   * 绘制装饰物
   */
  drawDecorations(ctx) {
    this.decorations.forEach(d => {
      switch (d.type) {
        case 'tree':   this.drawTree(ctx, d.x, d.y, d.size); break;
        case 'bush':   this.drawBush(ctx, d.x, d.y, d.size); break;
        case 'flower': this.drawFlower(ctx, d.x, d.y, d.size); break;
        case 'cat':    this.drawCat(ctx, d.x, d.y, d.size); break;
        case 'bird':   this.drawBird(ctx, d.x, d.y, d.size); break;
      }
    });
  },

  /**
   * 绘制卡通树
   */
  drawTree(ctx, x, y, size) {
    // 树干
    ctx.fillStyle = this.colors.treeTrunk;
    ctx.fillRect(x - size * 0.12, y - size * 0.1, size * 0.24, size * 0.6);

    // 树冠（多层圆形）
    ctx.fillStyle = this.colors.tree;
    ctx.beginPath();
    ctx.arc(x, y - size * 0.3, size * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.colors.grassDark;
    ctx.beginPath();
    ctx.arc(x - size * 0.2, y - size * 0.15, size * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.colors.treeDark;
    ctx.beginPath();
    ctx.arc(x + size * 0.2, y - size * 0.2, size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 高光
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x - size * 0.15, y - size * 0.45, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  /**
   * 绘制灌木丛
   */
  drawBush(ctx, x, y, size) {
    ctx.fillStyle = this.colors.grassDark;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.colors.grass;
    ctx.beginPath();
    ctx.arc(x - size * 0.5, y + size * 0.1, size * 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.colors.tree;
    ctx.beginPath();
    ctx.arc(x + size * 0.4, y - size * 0.1, size * 0.65, 0, Math.PI * 2);
    ctx.fill();
  },

  /**
   * 绘制小花
   */
  drawFlower(ctx, x, y, size) {
    // 花瓣
    const petalColors = ['#FF9EAA', '#FFD43B', '#FF9EAA', '#E8A0FF'];
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      ctx.fillStyle = petalColors[i];
      ctx.beginPath();
      ctx.ellipse(
        x + Math.cos(angle) * size,
        y + Math.sin(angle) * size,
        size * 0.6, size * 0.4,
        angle, 0, Math.PI * 2
      );
      ctx.fill();
    }
    // 花芯
    ctx.fillStyle = '#FFD43B';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
  },

  /**
   * 绘制小猫
   */
  drawCat(ctx, x, y, size) {
    ctx.font = `${size * 2}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐱', x, y);
  },

  /**
   * 绘制小鸟
   */
  drawBird(ctx, x, y, size) {
    ctx.font = `${size * 1.8}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐦', x, y);
  },

  /**
   * 绘制单个地点（卡通卡片风格）
   */
  drawLocation(ctx, loc) {
    const isSelected = this.selectedLocation && this.selectedLocation.id === loc.id;
    const moodColor = this.getLocationMoodColor(loc.id);
    const weather = this.getLocationWeather(loc.id);
    const r = this.config.locationRadius;

    // ---- 情绪光晕（柔和的呼吸感） ----
    if (moodColor) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      const gradient = ctx.createRadialGradient(loc.x, loc.y, r * 0.5, loc.x, loc.y, r + 20);
      gradient.addColorStop(0, moodColor);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(loc.x, loc.y, r + 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ---- 地点卡片底座（圆角矩形） ----
    const cardW = 64, cardH = 64;
    const cardX = loc.x - cardW / 2;
    const cardY = loc.y - cardH / 2;

    // 卡片阴影
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    this.roundRect(ctx, cardX + 2, cardY + 3, cardW, cardH, 14);
    ctx.fill();
    ctx.restore();

    // 卡片背景
    ctx.save();
    if (isSelected) {
      const selGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
      selGrad.addColorStop(0, '#E8F4FD');
      selGrad.addColorStop(1, '#FFFFFF');
      ctx.fillStyle = selGrad;
      ctx.strokeStyle = '#4A90D9';
      ctx.lineWidth = 3;
    } else if (moodColor) {
      const mGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
      mGrad.addColorStop(0, this.hexToRGBA(moodColor, 0.12));
      mGrad.addColorStop(1, '#FFFFFF');
      ctx.fillStyle = mGrad;
      ctx.strokeStyle = this.hexToRGBA(moodColor, 0.5);
      ctx.lineWidth = 2;
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#E8E0D0';
      ctx.lineWidth = 2;
    }
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 14);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // ---- Emoji / 心情图片 ----
    const moodLevel = this.getLocationMoodLevel(loc.id);
    if (moodLevel && this.moodImagesLoaded && this.moodImages[moodLevel]) {
      // 有心情记录且图片已加载，绘制心情图片
      const moodImg = this.moodImages[moodLevel];
      const imgSize = 36;
      ctx.drawImage(moodImg, loc.x - imgSize / 2, loc.y - imgSize / 2 - 2, imgSize, imgSize);
    } else {
      // 无心情记录或图片未加载，显示 emoji
      ctx.font = '30px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(loc.icon, loc.x, loc.y - 1);
    }

    // ---- 天气小图标 ----
    if (weather) {
      ctx.font = '14px sans-serif';
      ctx.fillText(weather, loc.x + r - 2, loc.y - r + 6);
    }

    // ---- 地点名称标签（圆角气泡） ----
    this.drawLabel(ctx, loc.x, loc.y + cardH / 2 + 10, loc.name, isSelected, moodColor);

    // ---- 选中时的动画边框 ----
    if (isSelected) {
      ctx.save();
      ctx.strokeStyle = '#4A90D9';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -(Date.now() / 50) % 8;
      this.roundRect(ctx, cardX - 4, cardY - 4, cardW + 8, cardH + 8, 16);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  },

  /**
   * 绘制圆角标签
   */
  drawLabel(ctx, x, y, text, isSelected, moodColor) {
    ctx.font = 'bold 12px "PingFang SC", "Microsoft YaHei", sans-serif';
    const textWidth = ctx.measureText(text).width;
    const padX = 10, padY = 5;
    const labelW = textWidth + padX * 2;
    const labelH = 20;
    const labelX = x - labelW / 2;
    const labelY = y;

    // 标签背景
    ctx.save();
    if (isSelected) {
      ctx.fillStyle = '#4A90D9';
    } else if (moodColor) {
      ctx.fillStyle = this.hexToRGBA(moodColor, 0.15);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
    }
    ctx.strokeStyle = isSelected ? '#4A90D9' : (moodColor || '#E8E0D0');
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, labelX, labelY, labelW, labelH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 标签文字
    ctx.fillStyle = isSelected ? '#FFFFFF' : this.colors.label;
    ctx.font = 'bold 12px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, labelY + labelH / 2);
  },

  // ==================== 工具方法 ====================

  /**
   * 绘制圆角矩形（兼容性好）
   */
  roundRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  },

  /**
   * Hex 颜色转 RGBA
   */
  hexToRGBA(hex, alpha) {
    if (!hex || hex.charAt(0) !== '#') return `rgba(0,0,0,${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  },

  // ==================== 数据操作 ====================

  addCustomLocation(name, icon, x, y) {
    const newLoc = {
      id: generateId('loc'),
      name,
      icon,
      x: x || this.config.width / 2,
      y: y || this.config.height / 2,
      isPreset: false,
      desc: '自定义地点'
    };
    this.locations.push(newLoc);
    this.saveCustomLocations();
    this.render();
    return newLoc;
  },

  removeCustomLocation(locId) {
    this.locations = this.locations.filter(l => l.id !== locId);
    this.saveCustomLocations();
    if (this.selectedLocation && this.selectedLocation.id === locId) {
      this.selectedLocation = null;
    }
    this.render();
  },

  updateCustomLocation(locId, updates) {
    const loc = this.locations.find(l => l.id === locId);
    if (loc && !loc.isPreset) {
      Object.assign(loc, updates);
      this.saveCustomLocations();
      this.render();
    }
  },

  refresh() {
    this.loadData();
    this.render();
  }
};
