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

  // 地图配置
  config: {
    width: 900,
    height: 700,
    locationRadius: 38
  },

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
    this.bindEvents();
    this.render();

    console.log('✅ 地图初始化完成，尺寸:', this.canvas.width, 'x', this.canvas.height, '地点数:', this.locations.length);
  },

  loadData() {
    const customLocations = StorageManager.load('emotion_custom_locations') || [];
    this.locations = [...this.presetLocations, ...customLocations];
    this.emotions = StorageManager.load('emotion_records') || [];
  },

  bindEvents() {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
  },

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
    };
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
    if (this.isDragging) return;
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
    const pos = this.getMousePos(e);
    const loc = this.findLocationAt(pos.x, pos.y);
    if (loc && !loc.isPreset) {
      this.isDragging = true;
      this.dragLocation = loc;
      this.dragOffset = { x: pos.x - loc.x, y: pos.y - loc.y };
      this.canvas.style.cursor = 'grabbing';
    }
  },

  handleMouseMove(e) {
    if (!this.isDragging || !this.dragLocation) return;
    const pos = this.getMousePos(e);
    this.dragLocation.x = pos.x - this.dragOffset.x;
    this.dragLocation.y = pos.y - this.dragOffset.y;
    this.render();
  },

  handleMouseUp() {
    if (this.isDragging && this.dragLocation) {
      this.saveCustomLocations();
      this.render();
    }
    this.isDragging = false;
    this.dragLocation = null;
    this.canvas.style.cursor = 'pointer';
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

  // ==================== 绘制方法 ====================

  render() {
    const ctx = this.ctx;
    const w = this.config.width;
    const h = this.config.height;

    ctx.clearRect(0, 0, w, h);

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
    // 7. 标题
    this.drawTitle(ctx, w);
    // 8. 图例
    this.drawLegend(ctx, w, h);
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

    // ---- Emoji 图标 ----
    ctx.font = '30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(loc.icon, loc.x, loc.y - 1);

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

  /**
   * 绘制标题
   */
  drawTitle(ctx, w) {
    ctx.save();
    ctx.fillStyle = '#F5E6C8';
    ctx.beginPath();
    this.roundRect(ctx, w / 2 - 110, 8, 220, 36, 18);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#8B6914';
    ctx.font = 'bold 18px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🗺️ 我的校园情绪地图', w / 2, 26);
  },

  /**
   * 绘制图例
   */
  drawLegend(ctx, w, h) {
    const items = [
      { color: this.colors.moodHappy, label: '😊 开心' },
      { color: this.colors.moodCalm,  label: '😌 平静' },
      { color: this.colors.moodNeutral, label: '😐 一般' },
      { color: this.colors.moodAnxious, label: '😟 焦虑' },
      { color: this.colors.moodSad,  label: '😢 低落' }
    ];

    const startX = w - 100;
    const startY = h - 140;
    const boxW = 90;
    const boxH = items.length * 22 + 30;

    // 图例背景
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.strokeStyle = '#E8E0D0';
    ctx.lineWidth = 1;
    this.roundRect(ctx, startX - 8, startY - 8, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 图例标题
    ctx.fillStyle = '#8B6914';
    ctx.font = 'bold 11px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('心情图例', startX + boxW / 2 - 8, startY + 8);

    // 图例项
    ctx.font = '11px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    items.forEach((item, i) => {
      const y = startY + 22 + i * 22;
      // 色块
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(startX + 4, y, 5, 0, Math.PI * 2);
      ctx.fill();
      // 标签
      ctx.fillStyle = '#5A4A3A';
      ctx.fillText(item.label, startX + 14, y + 1);
    });
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
