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
      // 显示解锁通知
      newUnlocks.forEach(ach => {
        setTimeout(() => {
          showToast(`🏆 成就解锁：${ach.icon} ${ach.name}`);
        }, 500);
      });
    }

    return newUnlocks;
  },

  /**
   * 检查某个成就是否已解锁
   */
  isUnlocked(achievementId) {
    return this.achievements.some(a => a.id === achievementId);
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

    container.innerHTML = `
      <div class="achievements-container">
        <div class="achievements-header">
          <h3 class="achievements-title">🏆 成就墙</h3>
          <span class="achievements-count">${unlockedCount} / ${totalCount}</span>
        </div>

        <div class="achievements-progress">
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${progress}%; background: var(--primary-color)"></div>
          </div>
          <span class="progress-text">${progress.toFixed(0)}% 已解锁</span>
        </div>

        <div class="achievements-grid">
          ${this.definitions.map(def => {
            const unlocked = this.isUnlocked(def.id);
            const unlockData = this.achievements.find(a => a.id === def.id);

            return `
              <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${unlocked ? def.icon : '🔒'}</div>
                <div class="achievement-name">${def.name}</div>
                <div class="achievement-desc">${def.description}</div>
                ${unlocked ? `
                  <div class="achievement-unlock-date">
                    ${formatDateCN(unlockData.unlockedAt)}
                  </div>
                ` : ''}
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
