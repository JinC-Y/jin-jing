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

  // 悬停放大
  hoveredLocation: null,
  hoverScale: 1.12,
  _hoverRaf: null,
  _touchMode: false,

  // 静态图层缓存（草地/道路/装饰只绘制一次）
  _bgCanvas: null,

  // 地图配置
  config: {
    width: 900,
    height: 700,
    locationRadius: 38
  },

  // 心情图片缓存
  moodImages: {},
  moodImagesLoaded: false,

  // 卡通配色（参考手绘校园地图风格）
  colors: {
    grass: '#8ACB4A',          // 鲜绿草地
    grassDark: '#6DB234',      // 深绿（描边/阴影）
    grassLight: '#A6DC6C',     // 浅绿（高光）
    // ---- 道路（沥青路三层结构） ----
    sidewalk: '#EFE7D5',       // 人行道
    sidewalkEdge: '#DDD3BC',   // 人行道外沿
    curb: '#B9B2A2',           // 路缘石
    asphalt: '#CFCBC2',        // 沥青路面
    asphaltShade: 'rgba(90,86,78,0.16)',  // 路面阴影
    crosswalk: 'rgba(252,250,243,0.94)',  // 斑马线
    outline: '#4A7A28',        // 深绿描边
    outlineSoft: 'rgba(74,122,40,0.55)',
    labelBg: '#FF9F1C',        // 橙色标签
    labelBgDark: '#E8860A',    // 标签描边
    labelText: '#FFFFFF',
    wall: '#FFFFFF',           // 建筑墙体
    wallShade: '#E8EEF5',      // 墙体暗面
    roofRed: '#E8552F',        // 红屋顶
    roofOrange: '#F5A623',     // 橙屋顶
    roofBlue: '#3E8FD4',       // 蓝屋顶
    roofBrown: '#B5651D',      // 棕屋顶
    window: '#7EC8F0',         // 窗户
    windowDeep: '#4FA8DC',
    trunk: '#8B5A2B',          // 树干
    tree: '#7CC242',           // 树冠
    treeDark: '#57A02A',       // 树冠暗面
    treeLight: '#A5DC6B',      // 树冠高光
    water: '#7EC8E3',          // 湖水
    waterLight: '#B8E4F2',     // 湖水高光
    sand: '#F2E3B6',           // 沙地/小径
    moodHappy: '#51CF66',
    moodCalm: '#4A90D9',
    moodNeutral: '#FFD43B',
    moodAnxious: '#FF922B',
    moodSad: '#FF6B6B'
  },

  // 预设地点（type 决定绘制的卡通建筑样式）
  presetLocations: [
    { id: 'loc_gate',       name: '校门',   x: 450, y: 645, icon: '🏫', type: 'gate',       isPreset: true, desc: '梦想的起点' },
    { id: 'loc_library',    name: '图书馆', x: 450, y: 348, icon: '📖', type: 'library',    isPreset: true, desc: '静谧书海' },
    { id: 'loc_teaching',   name: '教学楼', x: 285, y: 205, icon: '📚', type: 'teaching',   isPreset: true, desc: '知识的殿堂' },
    { id: 'loc_canteen',    name: '食堂',   x: 665, y: 172, icon: '🍜', type: 'canteen',    isPreset: true, desc: '美食的天堂' },
    { id: 'loc_dorm',       name: '寝室',   x: 762, y: 425, icon: '🏠', type: 'dorm',       isPreset: true, desc: '温馨的小窝' },
    { id: 'loc_gym',        name: '体育馆', x: 140, y: 445, icon: '🏀', type: 'gym',        isPreset: true, desc: '挥洒汗水' },
    { id: 'loc_playground', name: '操场',   x: 152, y: 252, icon: '🏃', type: 'playground', isPreset: true, desc: '奔跑吧青春' },
    { id: 'loc_lab',        name: '实验室', x: 392, y: 112, icon: '🔬', type: 'lab',        isPreset: true, desc: '探索未知' },
    { id: 'loc_park',       name: '小花园', x: 620, y: 572, icon: '🌸', type: 'garden',     isPreset: true, desc: '静享花开' },
    { id: 'loc_lake',       name: '学子湖', x: 255, y: 505, icon: '🐟', type: 'pavilion',   isPreset: true, desc: '湖光潋滟' }
  ],

  // 蜿蜒道路（w = 沥青路面宽度，主路更宽）
  roads: [
    // 主横路
    { w: 30, pts: [{ x: 6, y: 415 }, { x: 180, y: 396 }, { x: 400, y: 402 }, { x: 640, y: 408 }, { x: 894, y: 396 }] },
    // 主纵路（校门 → 实验楼）
    { w: 30, pts: [{ x: 450, y: 52 }, { x: 452, y: 240 }, { x: 448, y: 400 }, { x: 452, y: 560 }, { x: 450, y: 704 }] },
    // 上方横路
    { w: 22, pts: [{ x: 136, y: 188 }, { x: 300, y: 170 }, { x: 450, y: 182 }, { x: 612, y: 168 }, { x: 796, y: 192 }] },
    // 左上纵路
    { w: 18, pts: [{ x: 180, y: 396 }, { x: 168, y: 296 }, { x: 136, y: 188 }] },
    // 右上纵路
    { w: 18, pts: [{ x: 640, y: 408 }, { x: 676, y: 292 }, { x: 796, y: 192 }] },
    // 右下支路
    { w: 18, pts: [{ x: 640, y: 408 }, { x: 706, y: 486 }, { x: 726, y: 578 }, { x: 806, y: 664 }] },
    // 左下支路（通往小花园与学子湖）
    { w: 18, pts: [{ x: 452, y: 566 }, { x: 344, y: 592 }, { x: 196, y: 588 }, { x: 86, y: 624 }] },
    // 体育馆连接路
    { w: 16, pts: [{ x: 168, y: 296 }, { x: 120, y: 372 }, { x: 88, y: 446 }] },
    // 寝室连接路
    { w: 16, pts: [{ x: 706, y: 486 }, { x: 772, y: 452 }, { x: 806, y: 436 }] }
  ],

  // 装饰物（树木、灌木、花丛、云朵）
  decorations: [
    // 树丛（成簇分布，贴近参考图的簇状树林）
    { type: 'tree', x: 62, y: 92, size: 19 },
    { type: 'tree', x: 100, y: 128, size: 24 },
    { type: 'tree', x: 58, y: 152, size: 16 },
    { type: 'tree', x: 232, y: 92, size: 20 },
    { type: 'tree', x: 268, y: 128, size: 15 },
    { type: 'tree', x: 520, y: 78, size: 18 },
    { type: 'tree', x: 556, y: 108, size: 14 },
    { type: 'tree', x: 812, y: 92, size: 21 },
    { type: 'tree', x: 852, y: 132, size: 16 },
    { type: 'tree', x: 836, y: 246, size: 18 },
    { type: 'tree', x: 872, y: 288, size: 14 },
    { type: 'tree', x: 66, y: 258, size: 15 },
    { type: 'tree', x: 42, y: 316, size: 18 },
    { type: 'tree', x: 58, y: 508, size: 20 },
    { type: 'tree', x: 96, y: 542, size: 15 },
    { type: 'tree', x: 354, y: 662, size: 19 },
    { type: 'tree', x: 396, y: 684, size: 15 },
    { type: 'tree', x: 552, y: 660, size: 20 },
    { type: 'tree', x: 592, y: 686, size: 15 },
    { type: 'tree', x: 826, y: 546, size: 18 },
    { type: 'tree', x: 862, y: 592, size: 14 },
    { type: 'tree', x: 704, y: 640, size: 17 },
    { type: 'tree', x: 604, y: 470, size: 16 },
    { type: 'tree', x: 636, y: 502, size: 13 },
    { type: 'tree', x: 322, y: 452, size: 15 },
    { type: 'tree', x: 196, y: 660, size: 16 },
    // 灌木
    { type: 'bush', x: 148, y: 108, size: 13 },
    { type: 'bush', x: 488, y: 118, size: 12 },
    { type: 'bush', x: 760, y: 100, size: 12 },
    { type: 'bush', x: 88, y: 398, size: 11 },
    { type: 'bush', x: 520, y: 470, size: 12 },
    { type: 'bush', x: 268, y: 616, size: 12 },
    { type: 'bush', x: 640, y: 620, size: 11 },
    { type: 'bush', x: 792, y: 392, size: 12 },
    // 花丛
    { type: 'flower', x: 320, y: 108, size: 6 },
    { type: 'flower', x: 344, y: 96, size: 5 },
    { type: 'flower', x: 596, y: 618, size: 6 },
    { type: 'flower', x: 566, y: 636, size: 5 },
    { type: 'flower', x: 168, y: 520, size: 6 },
    { type: 'flower', x: 200, y: 536, size: 5 },
    { type: 'flower', x: 828, y: 480, size: 5 },
    // 云朵
    { type: 'cloud', x: 210, y: 58, size: 22 },
    { type: 'cloud', x: 690, y: 48, size: 18 },
    { type: 'cloud', x: 840, y: 148, size: 16 }
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

    // 初始化悬停缩放状态
    this.locations.forEach(loc => {
      if (loc._scale === undefined) loc._scale = 1;
      if (loc._targetScale === undefined) loc._targetScale = 1;
    });
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
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
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
    // 标记为触摸设备，关闭鼠标悬停效果
    this._touchMode = true;
    this.setHoveredLocation(null);

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

      // 建筑主体包围盒（含屋顶与台阶）
      if (x >= loc.x - 37 && x <= loc.x + 37 &&
          y >= loc.y - 44 && y <= loc.y + 28) {
        return loc;
      }

      // 名称标签区域
      if (x >= loc.x - 50 && x <= loc.x + 50 &&
          y >= loc.y + 20 && y <= loc.y + 44) {
        return loc;
      }

      // 兜底：圆形范围
      const dist = Math.sqrt((x - loc.x) ** 2 + (y - loc.y) ** 2);
      if (dist <= this.config.locationRadius) {
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
      this.setHoveredLocation(null);
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
      // 平移时取消悬停
      this.setHoveredLocation(null);
      this.render();
      return;
    }

    // 触摸设备不做悬停
    if (this._touchMode) return;

    // ---- 悬停检测 ----
    const pos = this.getMousePos(e);
    const loc = this.findLocationAt(pos.x, pos.y);
    if (loc !== this.hoveredLocation) {
      this.setHoveredLocation(loc);
    }
  },

  /**
   * 鼠标移出画布
   */
  handleMouseLeave() {
    this.setHoveredLocation(null);
  },

  /**
   * 设置当前悬停地点，并驱动缩放动画
   */
  setHoveredLocation(loc) {
    if (loc === this.hoveredLocation) return;
    this.hoveredLocation = loc;

    // 光标反馈
    if (!this.isDragging && !this.isPanning) {
      this.canvas.style.cursor = loc ? 'pointer' : 'grab';
    }

    // 更新缩放目标
    let needAnimate = false;
    this.locations.forEach(item => {
      const target = (loc && item.id === loc.id) ? this.hoverScale : 1;
      if (item._targetScale !== target) {
        item._targetScale = target;
        needAnimate = true;
      }
    });

    if (needAnimate) this.startHoverAnimation();
  },

  /**
   * 启动悬停缩放动画（帧循环，缓动收敛后自动停止）
   */
  startHoverAnimation() {
    if (this._hoverRaf) return;

    const step = () => {
      let active = false;

      this.locations.forEach(loc => {
        const target = loc._targetScale === undefined ? 1 : loc._targetScale;
        const current = loc._scale === undefined ? 1 : loc._scale;
        const diff = target - current;

        if (Math.abs(diff) > 0.0015) {
          // 指数缓动，接近时自动减速
          loc._scale = current + diff * 0.26;
          active = true;
        } else {
          loc._scale = target;
        }
      });

      this.render();

      if (active) {
        this._hoverRaf = requestAnimationFrame(step);
      } else {
        this._hoverRaf = null;
      }
    };

    this._hoverRaf = requestAnimationFrame(step);
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
    ctx.fillStyle = this.colors.grassDark;
    ctx.fillRect(0, 0, w, h);

    // 静态图层只绘制一次（草地 / 湖 / 道路 / 装饰），保证动画帧率
    if (!this._bgCanvas) this.buildStaticLayer();

    // ---- 应用视图变换（世界坐标层） ----
    ctx.save();
    ctx.translate(this.view.x, this.view.y);
    ctx.scale(this.view.scale, this.view.scale);

    if (this._bgCanvas) {
      ctx.drawImage(this._bgCanvas, 0, 0);
    } else {
      this.drawBackground(ctx, w, h);
      this.drawLake(ctx);
      this.drawRoads(ctx);
      this.drawDecorations(ctx);
    }

    this.locations.forEach(loc => this.drawLocation(ctx, loc));

    ctx.restore();
  },

  /**
   * 把不随交互变化的图层烘焙到离屏画布
   */
  buildStaticLayer() {
    if (!this._bgCanvas) {
      this._bgCanvas = document.createElement('canvas');
      this._bgCanvas.width = this.config.width;
      this._bgCanvas.height = this.config.height;
    }

    const c = this._bgCanvas.getContext('2d');
    if (!c) {
      this._bgCanvas = null;
      return;
    }

    c.clearRect(0, 0, this.config.width, this.config.height);
    this.drawBackground(c, this.config.width, this.config.height);
    this.drawLake(c);
    this.drawRoads(c);
    this.drawDecorations(c);
  },

  /**
   * 渲染 HTML 图例
   */
  renderLegend() {
    const container = document.getElementById('map-legend');
    if (!container) return;

    const items = [
      { img: 'assets/happy.png',   label: '开心' },
      { img: 'assets/calm.png',    label: '平静' },
      { img: 'assets/nutral.png',  label: '一般' },
      { img: 'assets/anxious.png', label: '焦虑' },
      { img: 'assets/sad.png',     label: '低落' }
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

    const toggle = container.querySelector('#legend-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        container.classList.toggle('collapsed');
      });
    }
  },

  /* ---------- 基础图元工具 ---------- */

  /**
   * 绘制带描边的矩形
   */
  box(ctx, x, y, w, h, fill, stroke, lw, r) {
    this.roundRect(ctx, x, y, w, h, r || 0);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw || 2;
      ctx.stroke();
    }
  },

  /**
   * 把多个圆合并成一个轮廓（用于树冠等有机形状）
   */
  blob(ctx, circles, fill, stroke, lw) {
    ctx.beginPath();
    circles.forEach(c => {
      ctx.moveTo(c[0] + c[2], c[1]);
      ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2);
    });
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw || 2;
      ctx.stroke();
    }
  },

  /* ---------- 背景与道路 ---------- */

  /**
   * 鲜绿草地 + 柔和色块肌理
   */
  drawBackground(ctx, w, h) {
    ctx.fillStyle = this.colors.grass;
    ctx.fillRect(0, 0, w, h);

    // 浅绿斑块，避免大面积纯色显得呆板
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = this.colors.grassLight;
    [
      [130, 95, 140, 78], [390, 62, 155, 70], [706, 96, 145, 76],
      [86, 566, 155, 80], [420, 646, 165, 68], [748, 566, 150, 78],
      [62, 336, 122, 72], [828, 338, 132, 80],
      [470, 470, 120, 62], [300, 330, 110, 58]
    ].forEach(p => {
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], p[2], p[3], 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  },

  /**
   * 学子湖
   */
  drawLake(ctx) {
    const cx = 255, cy = 505, rx = 86, ry = 56;

    // 岸边沙地
    ctx.save();
    ctx.fillStyle = this.colors.sand;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 3, rx + 11, ry + 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 水面
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.colors.water;
    ctx.fill();
    ctx.strokeStyle = this.colors.outlineSoft;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 水波高光
    ctx.save();
    ctx.strokeStyle = this.colors.waterLight;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    [[-42, -18, 28], [4, 4, 32], [-16, 24, 22], [30, -22, 20]].forEach(a => {
      ctx.beginPath();
      ctx.moveTo(cx + a[0], cy + a[1]);
      ctx.quadraticCurveTo(cx + a[0] + a[2] / 2, cy + a[1] - 6, cx + a[0] + a[2], cy + a[1]);
      ctx.stroke();
    });
    ctx.restore();

    // 荷叶
    ctx.save();
    ctx.fillStyle = '#5AA02A';
    ctx.strokeStyle = this.colors.outlineSoft;
    ctx.lineWidth = 1.4;
    [[-34, 12, 11], [26, 20, 8], [40, -6, 7]].forEach(p => {
      ctx.beginPath();
      ctx.ellipse(cx + p[0], cy + p[1], p[2], p[2] * 0.72, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  },

  /**
   * 平滑曲线路径（把控制点串成蜿蜒小路）
   */
  tracePath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 2) {
      ctx.lineTo(pts[1].x, pts[1].y);
      return;
    }
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
  },

  /**
   * 沥青路面颗粒纹理
   */
  makeAsphaltPattern(ctx) {
    try {
      const size = 32;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const g = c.getContext('2d');
      if (!g) return null;

      g.fillStyle = this.colors.asphalt;
      g.fillRect(0, 0, size, size);

      // 确定性伪随机，保证每次纹理一致
      let seed = 20240910;
      const rnd = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };

      for (let i = 0; i < 130; i++) {
        g.fillStyle = rnd() > 0.5
          ? 'rgba(255,255,255,0.07)'
          : 'rgba(96,90,80,0.07)';
        const s = 0.8 + rnd() * 1.7;
        g.fillRect(rnd() * size, rnd() * size, s, s);
      }

      return ctx.createPattern(c, 'repeat');
    } catch (e) {
      return null;
    }
  },

  /**
   * 真实感道路：人行道 + 路缘石 + 沥青路面（分层错位形成路缘）
   */
  drawRoads(ctx) {
    const C = this.colors;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 分层统一描边：所有路的同一层一起画，交叉口才能正确合并
    const strokeLayer = (extra, style) => {
      ctx.strokeStyle = style;
      this.roads.forEach(road => {
        ctx.lineWidth = road.w + extra;
        this.tracePath(ctx, road.pts);
        ctx.stroke();
      });
    };

    // 1. 人行道外沿（最宽的浅色边）
    strokeLayer(20, C.sidewalkEdge);
    // 2. 人行道
    strokeLayer(15, C.sidewalk);
    // 3. 路缘石
    strokeLayer(8, C.curb);

    // 4. 沥青路面（带颗粒纹理）
    const pattern = this.makeAsphaltPattern(ctx);
    ctx.strokeStyle = pattern || C.asphalt;
    this.roads.forEach(road => {
      ctx.lineWidth = road.w;
      this.tracePath(ctx, road.pts);
      ctx.stroke();
    });

    ctx.restore();

    // 5. 斑马线
    this.drawCrosswalks(ctx);
  },

  /**
   * 绘制斑马线
   */
  drawCrosswalks(ctx) {
    ctx.save();
    ctx.fillStyle = this.colors.crosswalk;

    // 横跨纵向主路（交叉口上下各一条）
    this.paintCrosswalk(ctx, 450, 366, 46, 20);
    this.paintCrosswalk(ctx, 450, 444, 46, 20);
    // 横跨右侧纵向支路
    this.paintCrosswalk(ctx, 645, 372, 34, 17);
    // 横跨左侧纵向支路
    this.paintCrosswalk(ctx, 176, 362, 34, 17);

    ctx.restore();
  },

  /**
   * 单条斑马线：条纹沿道路方向排列
   * @param {number} cx 中心 x
   * @param {number} cy 中心 y
   * @param {number} span 覆盖的路宽
   * @param {number} depth 斑马线自身进深
   */
  paintCrosswalk(ctx, cx, cy, span, depth) {
    const count = 5;
    const sw = 5;
    const gap = (span - count * sw) / (count - 1);
    let x = cx - span / 2;

    for (let i = 0; i < count; i++) {
      this.roundRect(ctx, x, cy - depth / 2, sw, depth, 1.5);
      ctx.fill();
      x += sw + gap;
    }
  },

  /* ---------- 装饰物 ---------- */

  drawDecorations(ctx) {
    this.decorations.forEach(d => {
      switch (d.type) {
        case 'tree':   this.drawTree(ctx, d.x, d.y, d.size); break;
        case 'bush':   this.drawBush(ctx, d.x, d.y, d.size); break;
        case 'flower': this.drawFlower(ctx, d.x, d.y, d.size); break;
        case 'cloud':  this.drawCloud(ctx, d.x, d.y, d.size); break;
      }
    });
  },

  /**
   * 卡通树（簇状树冠 + 描边 + 高光）
   */
  drawTree(ctx, x, y, s) {
    const o = this.colors.outline;

    // 树干
    ctx.beginPath();
    ctx.moveTo(x - s * 0.12, y + s * 0.34);
    ctx.lineTo(x - s * 0.08, y - s * 0.06);
    ctx.lineTo(x + s * 0.08, y - s * 0.06);
    ctx.lineTo(x + s * 0.12, y + s * 0.34);
    ctx.closePath();
    ctx.fillStyle = this.colors.trunk;
    ctx.fill();
    ctx.strokeStyle = this.colors.outlineSoft;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 树冠暗面（整体轮廓）
    this.blob(ctx, [
      [x, y - s * 0.24, s * 0.56],
      [x - s * 0.36, y - s * 0.10, s * 0.40],
      [x + s * 0.36, y - s * 0.10, s * 0.40]
    ], this.colors.treeDark, o, 1.7);

    // 树冠亮面
    this.blob(ctx, [
      [x - s * 0.05, y - s * 0.36, s * 0.46],
      [x + s * 0.24, y - s * 0.20, s * 0.32],
      [x - s * 0.27, y - s * 0.22, s * 0.30]
    ], this.colors.tree, null);

    // 高光
    this.blob(ctx, [
      [x - s * 0.16, y - s * 0.48, s * 0.22]
    ], this.colors.treeLight, null);
  },

  /**
   * 灌木丛
   */
  drawBush(ctx, x, y, s) {
    const o = this.colors.outline;
    this.blob(ctx, [
      [x, y, s], [x - s * 0.62, y + s * 0.12, s * 0.72], [x + s * 0.62, y + s * 0.12, s * 0.72]
    ], this.colors.treeDark, o, 1.5);

    this.blob(ctx, [
      [x - s * 0.14, y - s * 0.24, s * 0.66], [x + s * 0.36, y - s * 0.10, s * 0.48]
    ], this.colors.tree, null);

    this.blob(ctx, [[x - s * 0.24, y - s * 0.34, s * 0.30]], this.colors.treeLight, null);
  },

  /**
   * 小花
   */
  drawFlower(ctx, x, y, s) {
    const o = 'rgba(74,122,40,0.5)';
    const petals = ['#FF6B8A', '#FFD166', '#FF9F1C', '#E86A92'];
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + 0.4;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * s, y + Math.sin(a) * s, s * 0.62, s * 0.44, a, 0, Math.PI * 2);
      ctx.fillStyle = petals[i];
      ctx.fill();
      ctx.strokeStyle = o;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, s * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = '#FFE066';
    ctx.fill();
    ctx.strokeStyle = o;
    ctx.lineWidth = 1;
    ctx.stroke();
  },

  /**
   * 云朵
   */
  drawCloud(ctx, x, y, s) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    this.blob(ctx, [
      [x, y, s * 0.72], [x - s * 0.72, y + s * 0.16, s * 0.5], [x + s * 0.74, y + s * 0.14, s * 0.52]
    ], '#FFFFFF', 'rgba(255,255,255,0.9)', 1);
    ctx.restore();
  },

  /* ---------- 地点 ---------- */

  /**
   * 绘制单个地点：光晕 + 阴影 + 卡通建筑 + 心情徽章 + 标签
   */
  drawLocation(ctx, loc) {
    const isSelected = this.selectedLocation && this.selectedLocation.id === loc.id;
    const isHovered = this.hoveredLocation && this.hoveredLocation.id === loc.id;
    const moodColor = this.getLocationMoodColor(loc.id);
    const moodLevel = this.getLocationMoodLevel(loc.id);
    const cx = loc.x;
    const by = loc.y + 22;          // 建筑底部基线
    const scale = loc._scale === undefined ? 1 : loc._scale;

    // ---- 悬停缩放（以建筑底部为锚点，整体放大并微微上浮） ----
    ctx.save();
    if (scale !== 1 || isHovered) {
      ctx.translate(cx, by);
      // 上浮量在屏幕坐标系下恒定（不受 scale 二次放大）
      if (isHovered) ctx.translate(0, -3.5);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -by);
    }

    // ---- 情绪光晕 ----
    if (moodColor) {
      ctx.save();
      const g = ctx.createRadialGradient(cx, loc.y - 8, 8, cx, loc.y - 8, 78);
      g.addColorStop(0, this.hexToRGBA(moodColor, 0.36));
      g.addColorStop(0.55, this.hexToRGBA(moodColor, 0.14));
      g.addColorStop(1, this.hexToRGBA(moodColor, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, loc.y - 8, 78, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ---- 选中虚线光圈 ----
    if (isSelected) {
      ctx.save();
      ctx.strokeStyle = '#FF7A00';
      ctx.lineWidth = 2.6;
      ctx.setLineDash([7, 6]);
      ctx.lineDashOffset = -(Date.now() / 60) % 13;
      ctx.beginPath();
      ctx.arc(cx, loc.y - 6, 54, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ---- 地面投影（悬停时变大变淡，做出"抬升"感） ----
    ctx.save();
    ctx.fillStyle = isHovered ? 'rgba(58,102,28,0.26)' : 'rgba(58,102,28,0.20)';
    ctx.beginPath();
    ctx.ellipse(cx, by - 1, isHovered ? 36 : 33, isHovered ? 9.5 : 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ---- 建筑 ----
    this.drawBuilding(ctx, loc, cx, by);

    // ---- 心情徽章 ----
    if (moodLevel && this.moodImagesLoaded && this.moodImages[moodLevel]) {
      this.drawMoodBadge(ctx, cx + 33, by - 54, this.moodImages[moodLevel], moodColor);
    }

    // ---- 名称标签 ----
    this.drawLabel(ctx, cx, by + 13, loc.name, isSelected, moodColor);

    // ---- 结束缩放变换 ----
    ctx.restore();
  },

  /**
   * 心情徽章（圆形裁剪的素材图）
   */
  drawMoodBadge(ctx, x, y, img, moodColor) {
    const r = 16;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, r + 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = moodColor || this.colors.outline;
    ctx.lineWidth = 2.2;
    ctx.stroke();
  },

  /**
   * 建筑分发
   */
  drawBuilding(ctx, loc, cx, by) {
    const type = loc.isPreset ? (loc.type || 'house') : 'house';
    switch (type) {
      case 'teaching':   return this.bTeaching(ctx, cx, by);
      case 'library':    return this.bLibrary(ctx, cx, by);
      case 'canteen':    return this.bCanteen(ctx, cx, by);
      case 'dorm':       return this.bDorm(ctx, cx, by);
      case 'gym':        return this.bGym(ctx, cx, by);
      case 'playground': return this.bPlayground(ctx, cx, by);
      case 'lab':        return this.bLab(ctx, cx, by);
      case 'gate':       return this.bGate(ctx, cx, by);
      case 'garden':     return this.bGarden(ctx, cx, by);
      case 'pavilion':   return this.bPavilion(ctx, cx, by);
      default:           return this.bHouse(ctx, cx, by, loc.icon);
    }
  },

  /**
   * 教学楼
   */
  bTeaching(ctx, cx, by) {
    const o = this.colors.outline;
    const w = 62, h = 32;
    const x = cx - w / 2;
    const y = by - 6 - h;

    // 背后副楼
    this.box(ctx, x - 15, by - 6 - 24, 17, 24, this.colors.wallShade, o, 1.7);

    // 台阶
    this.box(ctx, cx - 30, by - 6, 60, 6, this.colors.wallShade, o, 1.6);

    // 主体
    this.box(ctx, x, y, w, h, this.colors.wall, o, 2);

    // 挑檐屋顶
    this.box(ctx, x - 5, y - 9, w + 10, 10, this.colors.roofRed, o, 2, 2);

    // 窗户
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        this.box(ctx, x + 6 + c * 13, y + 6 + r * 12, 9, 8, this.colors.window, o, 1.2, 1.5);
      }
    }

    // 门
    this.box(ctx, cx - 7, by - 6 - 14, 14, 14, this.colors.roofBrown, o, 1.6, 2);
  },

  /**
   * 图书馆（山墙 + 柱廊）
   */
  bLibrary(ctx, cx, by) {
    const o = this.colors.outline;
    const w = 62;

    // 台阶
    this.box(ctx, cx - 33, by - 6, 66, 6, this.colors.wallShade, o, 1.6);

    // 主体
    this.box(ctx, cx - w / 2, by - 36, w, 30, this.colors.wall, o, 2);

    // 山墙
    ctx.beginPath();
    ctx.moveTo(cx - w / 2 - 5, by - 36);
    ctx.lineTo(cx, by - 58);
    ctx.lineTo(cx + w / 2 + 5, by - 36);
    ctx.closePath();
    ctx.fillStyle = this.colors.roofRed;
    ctx.fill();
    ctx.strokeStyle = o;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 圆窗
    ctx.beginPath();
    ctx.arc(cx, by - 45, 4.6, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF3C4';
    ctx.fill();
    ctx.strokeStyle = o;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 柱廊
    for (let i = 0; i < 5; i++) {
      this.box(ctx, cx - w / 2 + 5 + i * 12, by - 32, 5, 26, '#FFFFFF', o, 1.3, 1);
    }
  },

  /**
   * 食堂（条纹雨棚）
   */
  bCanteen(ctx, cx, by) {
    const o = this.colors.outline;
    const w = 56, h = 24;
    const x = cx - w / 2;
    const y = by - 6 - h;

    this.box(ctx, cx - 28, by - 6, 56, 6, this.colors.wallShade, o, 1.6);
    this.box(ctx, x, y, w, h, this.colors.wall, o, 2);

    // 雨棚
    const aw = w + 12, ax = x - 6, ay = y - 11;
    this.box(ctx, ax, ay, aw, 12, this.colors.roofRed, o, 2, 3);
    ctx.save();
    this.roundRect(ctx, ax, ay, aw, 12, 3);
    ctx.clip();
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(ax + i * 11.4 + 5.7, ay, 5.7, 12);
    }
    ctx.restore();
    this.roundRect(ctx, ax, ay, aw, 12, 3);
    ctx.strokeStyle = o;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 落地窗
    this.box(ctx, x + 7, y + 6, w - 14, 12, this.colors.window, o, 1.4, 2);

    // 门
    this.box(ctx, cx - 6, by - 6 - 11, 12, 11, this.colors.roofBrown, o, 1.5, 2);
  },

  /**
   * 寝室楼
   */
  bDorm(ctx, cx, by) {
    const o = this.colors.outline;
    const w = 46, h = 50;
    const x = cx - w / 2;
    const y = by - 6 - h;

    this.box(ctx, cx - 24, by - 6, 48, 6, this.colors.wallShade, o, 1.6);
    this.box(ctx, x, y, w, h, this.colors.wall, o, 2);
    this.box(ctx, x - 4, y - 9, w + 8, 10, this.colors.roofOrange, o, 2, 2);

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        this.box(ctx, x + 7 + c * 12, y + 7 + r * 12, 8, 8, this.colors.window, o, 1.1, 1.5);
      }
    }

    this.box(ctx, cx - 6, by - 6 - 12, 12, 12, this.colors.roofBrown, o, 1.5, 2);
  },

  /**
   * 体育馆（拱顶）
   */
  bGym(ctx, cx, by) {
    const o = this.colors.outline;
    const w = 58, h = 20;
    const x = cx - w / 2;
    const y = by - 6 - h;

    this.box(ctx, cx - 30, by - 6, 60, 6, this.colors.wallShade, o, 1.6);
    this.box(ctx, x, y, w, h, this.colors.wall, o, 2);

    // 拱形屋顶
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.quadraticCurveTo(cx, y - 30, x + w + 5, y);
    ctx.closePath();
    ctx.fillStyle = this.colors.roofBlue;
    ctx.fill();
    ctx.strokeStyle = o;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 拱顶条纹
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.quadraticCurveTo(cx, y - 30, x + w + 5, y);
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 10, y + 4);
      ctx.lineTo(cx + i * 15, y - 30);
      ctx.stroke();
    }
    ctx.restore();

    // 门窗
    this.box(ctx, x + 8, y + 5, 14, 9, this.colors.window, o, 1.3, 1.5);
    this.box(ctx, x + w - 22, y + 5, 14, 9, this.colors.window, o, 1.3, 1.5);
    this.box(ctx, cx - 7, by - 6 - 12, 14, 12, this.colors.roofBrown, o, 1.5, 2);
  },

  /**
   * 操场（跑道）
   */
  bPlayground(ctx, cx, by) {
    const o = this.colors.outline;
    const cy = by - 6 - 20;

    // 跑道
    ctx.beginPath();
    ctx.ellipse(cx, cy, 46, 26, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#E8734A';
    ctx.fill();
    ctx.strokeStyle = o;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 分道线
    ctx.beginPath();
    ctx.ellipse(cx, cy, 39, 21, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 内场草坪
    ctx.beginPath();
    ctx.ellipse(cx, cy, 32, 15.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#5FBF3A';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 中线
    ctx.beginPath();
    ctx.moveTo(cx, cy - 15);
    ctx.lineTo(cx, cy + 15);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  },

  /**
   * 实验室（弧顶 + 天线）
   */
  bLab(ctx, cx, by) {
    const o = this.colors.outline;
    const w = 52, h = 28;
    const x = cx - w / 2;
    const y = by - 6 - h;

    this.box(ctx, cx - 27, by - 6, 54, 6, this.colors.wallShade, o, 1.6);
    this.box(ctx, x, y, w, h, this.colors.wall, o, 2);

    // 弧顶
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.quadraticCurveTo(cx, y - 22, x + w + 5, y);
    ctx.closePath();
    ctx.fillStyle = this.colors.roofBlue;
    ctx.fill();
    ctx.strokeStyle = o;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 窗户
    for (let c = 0; c < 3; c++) {
      this.box(ctx, x + 7 + c * 15, y + 8, 10, 9, this.colors.window, o, 1.2, 1.5);
    }

    // 门
    this.box(ctx, cx - 7, by - 6 - 13, 14, 13, this.colors.roofBrown, o, 1.6, 2);

    // 天线
    ctx.beginPath();
    ctx.moveTo(cx, y - 16);
    ctx.lineTo(cx, y - 28);
    ctx.strokeStyle = o;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, y - 30, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#FF6B6B';
    ctx.fill();
    ctx.strokeStyle = o;
    ctx.lineWidth = 1.3;
    ctx.stroke();
  },

  /**
   * 校门
   */
  bGate(ctx, cx, by) {
    const o = this.colors.outline;

    this.box(ctx, cx - 34, by - 6, 68, 6, this.colors.wallShade, o, 1.6);

    // 立柱
    this.box(ctx, cx - 30, by - 6 - 40, 12, 40, this.colors.wall, o, 2);
    this.box(ctx, cx + 18, by - 6 - 40, 12, 40, this.colors.wall, o, 2);

    // 柱头
    this.box(ctx, cx - 33, by - 6 - 46, 18, 7, this.colors.wallShade, o, 1.6, 2);
    this.box(ctx, cx + 15, by - 6 - 46, 18, 7, this.colors.wallShade, o, 1.6, 2);

    // 横梁
    this.box(ctx, cx - 38, by - 6 - 58, 76, 13, this.colors.roofRed, o, 2, 3);

    // 校名牌
    this.box(ctx, cx - 19, by - 6 - 56, 38, 9, '#FFF3C4', o, 1.3, 2);
    ctx.fillStyle = '#A8560F';
    ctx.font = 'bold 7px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('校园', cx, by - 6 - 51.3);
  },

  /**
   * 小花园
   */
  bGarden(ctx, cx, by) {
    const o = this.colors.outline;

    // 花坛土台
    this.box(ctx, cx - 36, by - 14, 72, 14, '#B98A5C', o, 1.8, 5);

    // 花坛绿植
    ctx.beginPath();
    ctx.moveTo(cx - 32, by - 14);
    ctx.quadraticCurveTo(cx, by - 36, cx + 32, by - 14);
    ctx.closePath();
    ctx.fillStyle = this.colors.tree;
    ctx.fill();
    ctx.strokeStyle = o;
    ctx.lineWidth = 1.7;
    ctx.stroke();

    // 花朵
    const petal = ['#FF6B8A', '#FFD166', '#FF9F1C', '#E86A92', '#FFB3C6', '#B48CF2'];
    [[-24, -18], [-13, -23], [-2, -26], [9, -24], [19, -20], [27, -15]].forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(cx + p[0], by + p[1], 4.6, 0, Math.PI * 2);
      ctx.fillStyle = petal[i % petal.length];
      ctx.fill();
      ctx.strokeStyle = o;
      ctx.lineWidth = 1.1;
      ctx.stroke();
    });

    // 小树
    this.drawTree(ctx, cx - 40, by - 16, 12);
    this.drawTree(ctx, cx + 40, by - 16, 11);
  },

  /**
   * 湖边凉亭
   */
  bPavilion(ctx, cx, by) {
    const o = this.colors.outline;

    // 基座
    this.box(ctx, cx - 20, by - 8, 40, 8, this.colors.wallShade, o, 1.6, 2);

    // 柱子
    [-13, -4.5, 4.5, 13].forEach(dx => {
      this.box(ctx, cx + dx - 1.6, by - 28, 3.2, 20, '#D9A066', o, 1.2);
    });

    // 下层屋檐
    ctx.beginPath();
    ctx.moveTo(cx - 28, by - 28);
    ctx.lineTo(cx + 28, by - 28);
    ctx.lineTo(cx + 15, by - 42);
    ctx.lineTo(cx - 15, by - 42);
    ctx.closePath();
    ctx.fillStyle = this.colors.roofRed;
    ctx.fill();
    ctx.strokeStyle = o;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 上层屋檐
    ctx.beginPath();
    ctx.moveTo(cx - 21, by - 41);
    ctx.lineTo(cx + 21, by - 41);
    ctx.lineTo(cx + 10, by - 53);
    ctx.lineTo(cx - 10, by - 53);
    ctx.closePath();
    ctx.fillStyle = '#F2704A';
    ctx.fill();
    ctx.strokeStyle = o;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 宝顶
    ctx.beginPath();
    ctx.arc(cx, by - 56, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD166';
    ctx.fill();
    ctx.strokeStyle = o;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  },

  /**
   * 通用小屋（自定义地点）
   */
  bHouse(ctx, cx, by, icon) {
    const o = this.colors.outline;
    const w = 46, h = 28;
    const x = cx - w / 2;
    const y = by - 6 - h;

    this.box(ctx, cx - 24, by - 6, 48, 6, this.colors.wallShade, o, 1.6);

    // 墙体
    this.box(ctx, x, y, w, h, this.colors.wall, o, 2);

    // 人字屋顶
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 1);
    ctx.lineTo(cx, y - 22);
    ctx.lineTo(x + w + 7, y + 1);
    ctx.closePath();
    ctx.fillStyle = this.colors.roofOrange;
    ctx.fill();
    ctx.strokeStyle = o;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 窗
    this.box(ctx, x + 6, y + 8, 11, 10, this.colors.window, o, 1.2, 1.5);
    this.box(ctx, x + w - 17, y + 8, 11, 10, this.colors.window, o, 1.2, 1.5);

    // 门
    this.box(ctx, cx - 6, by - 6 - 12, 12, 12, this.colors.roofBrown, o, 1.5, 2);

    // 用户选择的图标（小招牌）
    if (icon) {
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, cx, y - 30);
    }
  },

  /**
   * 橙色胶囊标签（参考图样式）
   */
  drawLabel(ctx, x, y, text, isSelected, moodColor) {
    ctx.font = 'bold 13px "PingFang SC", "Microsoft YaHei", sans-serif';
    const tw = ctx.measureText(text).width;
    const padX = 13;
    const h = 25;
    const w = tw + padX * 2;
    const bx = x - w / 2;
    const by = y;

    // 投影
    ctx.save();
    ctx.fillStyle = 'rgba(58,102,28,0.28)';
    this.roundRect(ctx, bx, by + 3, w, h, h / 2);
    ctx.fill();
    ctx.restore();

    // 胶囊底
    this.roundRect(ctx, bx, by, w, h, h / 2);
    ctx.fillStyle = isSelected ? '#FF7A00' : this.colors.labelBg;
    ctx.fill();
    ctx.strokeStyle = this.colors.labelBgDark;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 顶部高光
    ctx.save();
    ctx.globalAlpha = 0.32;
    this.roundRect(ctx, bx + 3.5, by + 2.5, w - 7, h * 0.34, h * 0.17);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();

    // 文字
    ctx.fillStyle = this.colors.labelText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, by + h / 2 + 0.5);

    // 左侧心情色点
    if (moodColor) {
      ctx.beginPath();
      ctx.arc(bx - 7, by + h / 2, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = moodColor;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
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
      desc: '自定义地点',
      _scale: 1,
      _targetScale: 1
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
    if (this.hoveredLocation && this.hoveredLocation.id === locId) {
      this.hoveredLocation = null;
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
    // 数据重载后原对象已失效，清理悬停引用
    this.hoveredLocation = null;
    this.render();
  }
};
