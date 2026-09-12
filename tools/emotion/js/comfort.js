/* ========================================
   温暖安慰弹幕
   记录「低落」心情时，用满屏的温柔话语接住你
   —— 复刻参考视频「一份神秘礼物」的效果
   ======================================== */

const ComfortExperience = {
  containerId: 'comfort-overlay',
  fieldId: 'comfort-field',

  // 触发的心情等级（1 = 低落；想让它也在"焦虑"时出现，改成 [1, 2] 即可）
  triggerMoods: [1],

  // 气泡配色（柔和马卡龙色，取自参考视频）
  colors: [
    '#FDF4C8', '#FBE3C8', '#FBD8DF', '#D9EFD0',
    '#FFFFFF', '#F7C9C9', '#E3E8FA', '#FFF0D9',
    '#F5D9F0', '#E8F4E0', '#FDEDD3', '#FDE2E8'
  ],

  // 温暖的话
  messages: [
    '早安，开启美好一天！',
    '保持好心情',
    '天冷了，多穿衣服',
    '照顾好自己',
    '要天天开心吖~',
    '多喝水哦~',
    '别熬夜',
    '好好爱自己',
    '下次再试就好',
    '穿舒服的鞋，不累脚',
    '要按时吃饭',
    '你已经很棒啦，别苛责自己',
    '等待不会被辜负',
    '吃饭要有幸福感',
    '加油，你一定能做好的！',
    '你值得被世界温柔以待',
    '保持微笑吖',
    '顺顺利利',
    '今天也要加油',
    '今天过得开心嘛',
    '累了就歇，别硬撑',
    '每天都有小惊喜',
    '做件喜欢的小事',
    '早点休息',
    '压力大的话，出去散散步吧',
    '梦想成真',
    '难过就抱抱自己',
    'emo了，睡一觉',
    '湿头发别睡觉',
    '愿你遇小幸',
    '明天是新开始',
    '多吃水果',
    '发现生活小美好',
    '别多想啦，开心最重要',
    '愿你常感温暖',
    '愿你睡个好觉',
    '买杯热饮暖手',
    '情绪最重要',
    '想倾诉就找我',
    '抬头就是好天气',
    '你比想象中坚强',
    '不开心就跟我说',
    '慢慢做，不着急',
    '别给自己太大压力',
    '午餐吃热乎的',
    '冬天睡前泡泡脚',
    '备点零食饿了垫',
    '空调别对着头吹',
    '过马路看红绿灯',
    '别纠结过去',
    '你的努力我看见',
    '愿你所有烦恼都消失',
    '好心情一整天',
    '愿你的路顺利',
    '我站在你这边',
    '愿你笑容常在',
    '小愿望悄悄实现',
    '出门记得带伞',
    '手机及时充电',
    '和喜欢的人聊聊',
    '睡个好觉',
    '慢慢来，会好的',
    '今天的你已经很努力了',
    '允许自己休息一下',
    '哭出来也没关系',
    '你值得被好好对待',
    '一切都会慢慢变好',
    '我在这里陪着你'
  ],

  // 状态
  _bubbles: [],
  _animations: [],
  _timers: [],
  _token: 0,
  _active: false,
  _closeHandler: null,

  /**
   * 判断该心情是否需要安慰
   */
  shouldComfort(moodLevel) {
    return this.triggerMoods.indexOf(moodLevel) !== -1;
  },

  /**
   * 展示安慰弹幕
   * @param {number} moodLevel - 心情等级
   * @param {Object} location - 地点
   */
  show(moodLevel, location) {
    const overlay = document.getElementById(this.containerId);
    const field = document.getElementById(this.fieldId);
    if (!overlay || !field) return false;

    const token = ++this._token;
    this._active = true;
    this._clearTimers();

    // 顶部问候语
    const greeting = document.getElementById('comfort-greeting');
    if (greeting) {
      greeting.textContent = moodLevel === 1
        ? '今天辛苦了，这份小礼物送给你'
        : '别担心，慢慢来就好';
    }

    // 清空旧内容
    field.innerHTML = '';
    this._bubbles = [];
    this._animations = [];

    // 生成气泡
    const bubbles = this._buildBubbles(field);
    this._bubbles = bubbles;

    // 展开
    overlay.classList.remove('active');
    void overlay.offsetWidth;
    overlay.classList.add('active');

    // 逐个飘入
    this._animateIn(bubbles, token);

    // 结尾提示
    this._timers.push(setTimeout(() => {
      if (this._token !== token) return;
      const foot = document.getElementById('comfort-footer');
      if (foot) foot.classList.add('show');
    }, 6800));

    // 自动关闭
    this._timers.push(setTimeout(() => {
      if (this._token !== token) return;
      this.hide();
    }, 17000));

    // 点击关闭
    this._closeHandler = () => this.hide();
    overlay.addEventListener('click', this._closeHandler);

    return true;
  },

  /**
   * 按抖动网格铺满可视区域，避免气泡扎堆
   */
  _buildBubbles(field) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isNarrow = w < 640;

    const cols = Math.max(2, Math.floor(w / (isNarrow ? 108 : 148)));
    const rows = Math.max(5, Math.floor(h / (isNarrow ? 62 : 68)));
    const cellW = w / cols;
    const cellH = h / rows;

    // 收集所有格子位置
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({
          x: c * cellW + cellW / 2,
          y: r * cellH + cellH / 2
        });
      }
    }

    // 打乱格子，让相邻气泡的内容没有规律
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = cells[i]; cells[i] = cells[j]; cells[j] = t;
    }

    // 打乱文案
    const msgs = this.messages.slice();
    for (let i = msgs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = msgs[i]; msgs[i] = msgs[j]; msgs[j] = t;
    }

    const frag = document.createDocumentFragment();
    const list = [];

    cells.forEach((cell, i) => {
      const el = document.createElement('div');
      el.className = 'comfort-bubble';
      el.textContent = msgs[i % msgs.length];

      const bg = this.colors[Math.floor(Math.random() * this.colors.length)];
      const fontSize = isNarrow
        ? 10 + Math.random() * 4
        : 11 + Math.random() * 4.5;
      const rotate = (Math.random() - 0.5) * 14;
      const jx = (Math.random() - 0.5) * cellW * 0.72;
      const jy = (Math.random() - 0.5) * cellH * 0.6;

      el.style.background = bg;
      el.style.fontSize = fontSize.toFixed(1) + 'px';
      el.style.setProperty('--rot', rotate.toFixed(1) + 'deg');
      el.style.left = Math.round(cell.x + jx) + 'px';
      el.style.top = Math.round(cell.y + jy) + 'px';
      el.style.zIndex = String(1 + Math.floor(Math.random() * 5));

      frag.appendChild(el);
      list.push({
        el,
        rot: rotate,
        // 从四面八方飞入：根据所在方位决定起始方向
        fromX: cell.x < w / 2 ? -(120 + Math.random() * 220) : (120 + Math.random() * 220),
        fromY: cell.y < h / 2 ? -(90 + Math.random() * 160) : (90 + Math.random() * 160)
      });
    });

    field.appendChild(frag);
    return list;
  },

  /**
   * 依次飘入（总时长约 6.5 秒，铺满屏幕）
   */
  _animateIn(bubbles, token) {
    const total = bubbles.length;
    const spread = 6200;

    // 居中锚点必须写进每一帧，否则动画期间会被 translate 顶掉
    const anchor = 'translate(-50%, -50%)';

    bubbles.forEach((b, i) => {
      // 打散显示顺序，让上下左右同时长出来
      const order = (i * 7919) % total;
      const delay = (order / total) * spread + Math.random() * 260;
      const rot = b.rot.toFixed(1) + 'deg';

      if (typeof b.el.animate === 'function') {
        const anim = b.el.animate([
          {
            opacity: 0,
            transform: `${anchor} translate(${b.fromX.toFixed(0)}px, ${b.fromY.toFixed(0)}px) scale(0.55) rotate(${(b.rot - 10).toFixed(1)}deg)`
          },
          {
            opacity: 1,
            transform: `${anchor} scale(1.06) rotate(${rot})`,
            offset: 0.72
          },
          {
            opacity: 1,
            transform: `${anchor} scale(1) rotate(${rot})`
          }
        ], {
          duration: 720,
          delay,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'both'
        });
        this._animations.push(anim);
      } else {
        b.el.style.opacity = '1';
        b.el.style.transform = `${anchor} rotate(${rot})`;
      }
    });
  },

  /**
   * 关闭并清理
   */
  hide() {
    const overlay = document.getElementById(this.containerId);
    if (!overlay) return;

    this._token++;
    this._active = false;
    this._clearTimers();

    if (this._closeHandler) {
      overlay.removeEventListener('click', this._closeHandler);
      this._closeHandler = null;
    }

    overlay.classList.remove('active');

    // 取消动画，释放资源
    this._animations.forEach(a => {
      try { a.cancel(); } catch (e) { /* 忽略 */ }
    });
    this._animations = [];

    const foot = document.getElementById('comfort-footer');
    if (foot) foot.classList.remove('show');

    const field = document.getElementById(this.fieldId);
    setTimeout(() => {
      if (this._active) return;
      if (field) field.innerHTML = '';
      this._bubbles = [];
    }, 620);
  },

  _clearTimers() {
    this._timers.forEach(t => clearTimeout(t));
    this._timers = [];
  },

  isActive() {
    return this._active;
  }
};
