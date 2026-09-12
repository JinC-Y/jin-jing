/* ========================================
   情绪成就系统模块
   解锁徽章，增加趣味性和粘性
   ======================================== */

const Achievements = {
  containerId: 'achievements-section',
  achievements: [],

  // 成就定义
  definitions: [
    {
      id: 'first_record',
      icon: '🌟',
      name: '初次记录',
      description: '完成第一次情绪记录',
      check: (records) => records.length >= 1
    },
    {
      id: 'rainbow_week',
      icon: '🌈',
      name: '情绪彩虹',
      description: '一周内记录过全部5种情绪',
      check: (records) => {
        const weekRecords = EmotionRecorder.getWeekRecords();
        const moods = new Set(weekRecords.map(r => r.mood));
        return moods.size >= 5;
      }
    },
    {
      id: 'study_master',
      icon: '📚',
      name: '学霸模式',
      description: '连续7天在图书馆记录"开心"',
      check: (records) => {
        const libraryRecords = records
          .filter(r => {
            const loc = CampusMap.locations.find(l => l.id === r.locationId);
            return loc && loc.name === '图书馆' && r.mood === 5;
          })
          .sort((a, b) => a.timestamp - b.timestamp);

        if (libraryRecords.length < 7) return false;

        // 检查是否有7天连续
        const dates = [...new Set(libraryRecords.map(r => formatDate(r.timestamp)))];
        for (let i = 0; i <= dates.length - 7; i++) {
          const start = new Date(dates[i]);
          let连续 = true;
          for (let j = 1; j < 7; j++) {
            const next = new Date(dates[i]);
            next.setDate(next.getDate() + j);
            if (!dates.includes(formatDate(next))) {
              连续 = false;
              break;
            }
          }
          if (连续) return true;
        }
        return false;
      }
    },
    {
      id: 'foodie',
      icon: '🍜',
      name: '美食家',
      description: '在食堂记录10次开心',
      check: (records) => {
        const canteenHappy = records.filter(r => {
          const loc = CampusMap.locations.find(l => l.id === r.locationId);
          return loc && loc.name === '食堂' && r.mood === 5;
        });
        return canteenHappy.length >= 10;
      }
    },
    {
      id: 'night_owl',
      icon: '🌙',
      name: '夜猫子',
      description: '5次在晚上10点后记录情绪',
      check: (records) => {
        return records.filter(r => {
          const hour = new Date(r.timestamp).getHours();
          return hour >= 22;
        }).length >= 5;
      }
    },
    {
      id: 'explorer',
      icon: '🗺️',
      name: '探险家',
      description: '在10个不同地点记录过情绪',
      check: (records) => {
        const locations = new Set(records.map(r => r.locationId));
        return locations.size >= 10;
      }
    },
    {
      id: 'consistent_7',
      icon: '📅',
      name: '坚持打卡',
      description: '连续7天都有情绪记录',
      check: (records) => {
        const dates = [...new Set(records.map(r => formatDate(r.timestamp)))].sort();
        if (dates.length < 7) return false;

        for (let i = 0; i <= dates.length - 7; i++) {
          const start = new Date(dates[i]);
          let 连续 = true;
          for (let j = 1; j < 7; j++) {
            const next = new Date(dates[i]);
            next.setDate(next.getDate() + j);
            if (!dates.includes(formatDate(next))) {
              连续 = false;
              break;
            }
          }
          if (连续) return true;
        }
        return false;
      }
    },
    {
      id: 'early_bird',
      icon: '🐦',
      name: '早起鸟',
      description: '5次在早上7点前记录情绪',
      check: (records) => {
        return records.filter(r => {
          const hour = new Date(r.timestamp).getHours();
          return hour < 7;
        }).length >= 5;
      }
    },
    {
      id: 'happy_place',
      icon: '💝',
      name: '快乐老家',
      description: '在某个地点累计记录20次开心',
      check: (records) => {
        const locationHappy = {};
        records.filter(r => r.mood === 5).forEach(r => {
          locationHappy[r.locationId] = (locationHappy[r.locationId] || 0) + 1;
        });
        return Object.values(locationHappy).some(count => count >= 20);
      }
    },
    {
      id: 'record_master',
      icon: '🏆',
      name: '记录达人',
      description: '累计记录100次情绪',
      check: (records) => records.length >= 100
    },
    {
      id: 'week_warrior',
      icon: '⚔️',
      name: '周冠军',
      description: '连续4周都有情绪记录',
      check: (records) => {
        const dates = [...new Set(records.map(r => formatDate(r.timestamp)))].sort();
        if (dates.length < 28) return false;

        // 检查最近4周
        const now = new Date();
        for (let week = 0; week < 4; week++) {
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - (week * 7) - 6);
          const weekEnd = new Date(now);
          weekEnd.setDate(weekEnd.getDate() - (week * 7));
          const hasRecord = dates.some(d => {
            const dd = new Date(d);
            return dd >= weekStart && dd <= weekEnd;
          });
          if (!hasRecord) return false;
        }
        return true;
      }
    },
    {
      id: 'mood_swing',
      icon: '🎢',
      name: '过山车',
      description: '一天内情绪从1变化到5（或反过来）',
      check: (records) => {
        const dayGroups = {};
        records.forEach(r => {
          const date = formatDate(r.timestamp);
          if (!dayGroups[date]) dayGroups[date] = [];
          dayGroups[date].push(r.mood);
        });

        return Object.values(dayGroups).some(moods => {
          return moods.includes(1) && moods.includes(5);
        });
      }
    }
  ],

  /**
   * 初始化
   */
  init() {
    this.loadData();
  },

  /**
   * 从本地存储载入成就数据
   */
  loadData() {
    this.achievements = StorageManager.load('emotion_achievements') || [];
  },

  /**
   * 保存数据
   */
  saveData() {
    StorageManager.save('emotion_achievements', this.achievements);
  },

  /**
   * 检查所有成就
   * @param {Array} records - 情绪记录
   * @returns {Array} 新解锁的成就
   */
  checkAll(records) {
    const newUnlocks = [];

    this.definitions.forEach(def => {
      const alreadyUnlocked = this.achievements.find(a => a.id === def.id);
      if (alreadyUnlocked) return;

      try {
        if (def.check(records)) {
          const unlock = {
            id: def.id,
            unlockedAt: Date.now()
          };
          this.achievements.push(unlock);
          newUnlocks.push(def);
        }
      } catch (e) {
        console.error(`成就检查失败 [${def.id}]:`, e);
      }
    });

    if (newUnlocks.length > 0) {
      this.saveData();
      // 依次播放解锁特效
      newUnlocks.forEach(ach => this.enqueueUnlock(ach));
    }

    return newUnlocks;
  },

  /* ==================== 解锁特效 ==================== */

  _unlockQueue: [],
  _showingUnlock: false,
  _unlockTimer: null,

  /**
   * 加入解锁队列
   */
  enqueueUnlock(def) {
    this._unlockQueue.push(def);
    if (!this._showingUnlock) this.showNextUnlock();
  },

  /**
   * 播放下一个解锁特效
   */
  showNextUnlock() {
    const def = this._unlockQueue.shift();
    if (!def) {
      this._showingUnlock = false;
      return;
    }
    this._showingUnlock = true;

    // 若"心情已记录"弹窗正在显示，先让位给它，再播放成就特效
    const celebrate = document.getElementById('emotion-celebrate');
    const busy = celebrate && celebrate.classList.contains('active');
    const delay = busy ? 1500 : 350;

    setTimeout(() => {
      const c = document.getElementById('emotion-celebrate');
      if (c && c.classList.contains('active')) {
        c.classList.remove('active');
      }
      this.playUnlockEffect(def, () => {
        setTimeout(() => this.showNextUnlock(), 320);
      });
    }, delay);
  },

  /**
   * 播放单个成就解锁动画
   */
  playUnlockEffect(def, onDone) {
    const overlay = document.getElementById('achievement-unlock');
    if (!overlay) {
      // 兜底：没有弹窗元素时退回 toast
      showToast(`🏆 成就解锁：${def.icon} ${def.name}`);
      if (onDone) onDone();
      return;
    }

    const iconEl = document.getElementById('ach-badge-icon');
    const nameEl = document.getElementById('ach-unlock-name');
    const descEl = document.getElementById('ach-unlock-desc');
    const particlesEl = document.getElementById('ach-particles');

    if (iconEl) iconEl.textContent = def.icon;
    if (nameEl) nameEl.textContent = def.name;
    if (descEl) descEl.textContent = def.description;

    // 生成粒子
    if (particlesEl) {
      particlesEl.innerHTML = '';
      this.spawnUnlockParticles(particlesEl, def);
    }

    // 显示
    overlay.classList.remove('active');
    void overlay.offsetWidth;   // 强制重排以重播动画
    overlay.classList.add('active');

    // 音效感的视觉反馈：短暂高亮页面主色
    this.flashAccent();

    // 清理旧监听
    if (this._overlayClickHandler) {
      overlay.removeEventListener('click', this._overlayClickHandler);
    }
    if (this._unlockTimer) {
      clearTimeout(this._unlockTimer);
    }

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;

      if (this._unlockTimer) {
        clearTimeout(this._unlockTimer);
        this._unlockTimer = null;
      }
      overlay.removeEventListener('click', this._overlayClickHandler);
      this._overlayClickHandler = null;

      overlay.classList.remove('active');
      setTimeout(() => {
        if (particlesEl) particlesEl.innerHTML = '';
        if (onDone) onDone();
      }, 420);
    };

    this._overlayClickHandler = close;
    // 延迟绑定，避免触发的这次点击立刻关闭
    setTimeout(() => {
      if (!closed) overlay.addEventListener('click', close);
    }, 500);

    // 自动关闭
    this._unlockTimer = setTimeout(close, 4200);
  },

  /**
   * 生成爆裂粒子
   */
  spawnUnlockParticles(container, def) {
    const palette = ['✨', '⭐', '🌟', '💫', '🎉', '🎊', '🏆', '💛'];
    const count = 26;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'ach-particle';
      p.textContent = palette[Math.floor(Math.random() * palette.length)];

      // 在圆周上均匀分布 + 随机抖动，形成爆裂效果
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const dist = 130 + Math.random() * 130;

      p.style.setProperty('--tx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      p.style.setProperty('--ty', (Math.sin(angle) * dist - 20).toFixed(1) + 'px');
      p.style.setProperty('--rot', Math.round((Math.random() - 0.5) * 720) + 'deg');
      p.style.setProperty('--scale', (0.6 + Math.random() * 0.9).toFixed(2));
      p.style.setProperty('--dur', (1.0 + Math.random() * 0.9).toFixed(2) + 's');
      p.style.setProperty('--delay', (0.15 + Math.random() * 0.5).toFixed(2) + 's');

      // 起始位置在徽章附近
      const startR = 10 + Math.random() * 30;
      p.style.left = (Math.cos(angle) * startR).toFixed(1) + 'px';
      p.style.top = (Math.sin(angle) * startR).toFixed(1) + 'px';

      container.appendChild(p);
    }
  },

  /**
   * 页面主色闪烁（增强解锁的仪式感）
   */
  flashAccent() {
    const el = document.createElement('div');
    el.className = 'ach-accent-flash';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  },

  /**
   * 检查某个成就是否已解锁
   */
  isUnlocked(achievementId) {
    return this.achievements.some(a => a.id === achievementId);
  },

  /**
   * 获取某个成就的进度
   * @returns {{current:number, target:number}|null}
   */
  getProgress(id, records) {
    const now = typeof MockDate !== 'undefined' ? MockDate.now() : Date.now();
    const daysAgo = (n) => now - n * 24 * 60 * 60 * 1000;

    switch (id) {
      case 'first_record':
        return { current: Math.min(records.length, 1), target: 1 };

      case 'rainbow_week': {
        const weekRecords = records.filter(r => r.timestamp > daysAgo(7));
        const moods = new Set(weekRecords.map(r => r.mood));
        return { current: moods.size, target: 5 };
      }

      case 'study_master': {
        const libraryHappy = records.filter(r => {
          const loc = CampusMap.locations.find(l => l.id === r.locationId);
          return loc && loc.name === '图书馆' && r.mood === 5;
        });
        const dates = [...new Set(libraryHappy.map(r => formatDate(r.timestamp)))];
        return { current: Math.min(dates.length, 7), target: 7 };
      }

      case 'foodie': {
        const n = records.filter(r => {
          const loc = CampusMap.locations.find(l => l.id === r.locationId);
          return loc && loc.name === '食堂' && r.mood === 5;
        }).length;
        return { current: Math.min(n, 10), target: 10 };
      }

      case 'night_owl': {
        const n = records.filter(r => new Date(r.timestamp).getHours() >= 22).length;
        return { current: Math.min(n, 5), target: 5 };
      }

      case 'explorer': {
        const n = new Set(records.map(r => r.locationId)).size;
        return { current: Math.min(n, 10), target: 10 };
      }

      case 'consistent_7': {
        const dates = [...new Set(records.map(r => formatDate(r.timestamp)))].sort();
        return { current: Math.min(this.longestStreak(dates), 7), target: 7 };
      }

      case 'early_bird': {
        const n = records.filter(r => new Date(r.timestamp).getHours() < 7).length;
        return { current: Math.min(n, 5), target: 5 };
      }

      case 'happy_place': {
        const counts = {};
        records.filter(r => r.mood === 5).forEach(r => {
          counts[r.locationId] = (counts[r.locationId] || 0) + 1;
        });
        const max = Object.values(counts).length ? Math.max(...Object.values(counts)) : 0;
        return { current: Math.min(max, 20), target: 20 };
      }

      case 'record_master':
        return { current: Math.min(records.length, 100), target: 100 };

      case 'week_warrior': {
        const dates = [...new Set(records.map(r => formatDate(r.timestamp)))];
        let weeks = 0;
        const today = typeof MockDate !== 'undefined' ? MockDate.getDate() : new Date();
        for (let w = 0; w < 4; w++) {
          const weekEnd = new Date(today);
          weekEnd.setDate(weekEnd.getDate() - w * 7);
          const weekStart = new Date(weekEnd);
          weekStart.setDate(weekStart.getDate() - 6);
          const has = dates.some(d => {
            const dd = new Date(d + 'T00:00:00');
            return dd >= new Date(formatDate(weekStart) + 'T00:00:00') &&
                   dd <= new Date(formatDate(weekEnd) + 'T23:59:59');
          });
          if (has) weeks++;
        }
        return { current: weeks, target: 4 };
      }

      case 'mood_swing': {
        const groups = {};
        records.forEach(r => {
          const d = formatDate(r.timestamp);
          (groups[d] = groups[d] || []).push(r.mood);
        });
        const done = Object.values(groups).some(m => m.includes(1) && m.includes(5));
        return { current: done ? 1 : 0, target: 1 };
      }

      default:
        return null;
    }
  },

  /**
   * 计算最长连续天数
   */
  longestStreak(sortedDates) {
    if (sortedDates.length === 0) return 0;
    let best = 1;
    let cur = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1] + 'T00:00:00');
      const curr = new Date(sortedDates[i] + 'T00:00:00');
      const diff = Math.round((curr - prev) / (24 * 60 * 60 * 1000));
      if (diff === 1) {
        cur++;
        if (cur > best) best = cur;
      } else if (diff > 1) {
        cur = 1;
      }
    }
    return best;
  },

  /**
   * 渲染成就页面
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const unlockedCount = this.achievements.length;
    const totalCount = this.definitions.length;
    const progress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;
    const records = EmotionRecorder.records;

    container.innerHTML = `
      <div class="achievements-container">
        <div class="achievements-header">
          <h3 class="achievements-title">🏆 成就墙</h3>
          <span class="achievements-count">${unlockedCount} / ${totalCount}</span>
        </div>

        <div class="achievements-progress">
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${progress}%"></div>
          </div>
          <span class="progress-text">${progress.toFixed(0)}% 已解锁</span>
        </div>

        <div class="achievements-grid">
          ${this.definitions.map(def => {
            const unlocked = this.isUnlocked(def.id);
            const unlockData = this.achievements.find(a => a.id === def.id);
            const prog = unlocked ? null : this.getProgress(def.id, records);
            const pct = prog ? Math.min(100, (prog.current / prog.target) * 100) : 0;

            return `
              <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${unlocked ? def.icon : '🔒'}</div>
                <div class="achievement-name">${def.name}</div>
                <div class="achievement-desc">${def.description}</div>
                ${unlocked ? `
                  <div class="achievement-unlock-date">
                    ✓ ${formatDateCN(unlockData.unlockedAt)}
                  </div>
                ` : (prog ? `
                  <div class="achievement-progress-wrap">
                    <div class="achievement-progress-bar">
                      <div class="achievement-progress-fill" style="width: ${pct}%"></div>
                    </div>
                    <span class="achievement-progress-text">${prog.current}/${prog.target}</span>
                  </div>
                ` : '')}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  /**
   * 刷新
   */
  refresh() {
    this.render();
  }
};
