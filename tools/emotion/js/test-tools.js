/* ========================================
   测试工具模块
   提供日期跳转和数据恢复功能
   ======================================== */

const TestTools = {
  _backupData: null,
  _isTesting: false,

  /**
   * 初始化
   */
  init() {
    this._backupData = null;
    this._isTesting = false;
    this.render();
    this.bindEvents();
  },

  /**
   * 渲染测试工具栏
   */
  render() {
    const container = document.getElementById('test-tools');
    if (!container) return;

    container.innerHTML = `
      <div class="test-toolbar">
        <div class="test-toolbar-title">🧪 测试工具</div>

        <div class="test-date-display">
          <span class="test-date-label">当前日期</span>
          <span class="test-date-value" id="test-current-date">${formatDateCN(MockDate.getDate())}</span>
          <span class="test-date-badge" id="test-mode-badge" style="display:none">测试中</span>
        </div>

        <div class="test-actions">
          <button class="btn-sm btn-secondary" id="test-prev-day" title="回到昨天">⬅️ 昨天</button>
          <button class="btn-sm btn-primary" id="test-next-day" title="跳到明天">明天 ➡️</button>
          <button class="btn-sm btn-secondary" id="test-jump-3" title="跳3天">+3天</button>
          <button class="btn-sm btn-secondary" id="test-jump-7" title="跳7天">+7天</button>
        </div>

        <div class="test-actions">
          <button class="btn-sm btn-danger" id="test-backup" title="备份当前数据">💾 备份数据</button>
          <button class="btn-sm btn-secondary" id="test-restore" title="恢复备份数据" disabled>🔄 恢复数据</button>
          <button class="btn-sm btn-secondary" id="test-reset-date" title="回到今天">📅 回到今天</button>
          <button class="btn-sm btn-danger" id="test-reset-all" title="清除所有数据">🗑️ 清除全部</button>
        </div>
      </div>
    `;
  },

  /**
   * 绑定事件
   */
  bindEvents() {
    // 昨天
    const prevBtn = document.getElementById('test-prev-day');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        MockDate.prevDay();
        this.updateDateDisplay();
        this.refreshAll();
        showToast(`📅 回到 ${formatDateCN(MockDate.getDate())}`);
      });
    }

    // 明天
    const nextBtn = document.getElementById('test-next-day');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        MockDate.nextDay();
        this.updateDateDisplay();
        this.refreshAll();
        showToast(`📅 跳到 ${formatDateCN(MockDate.getDate())}`);
      });
    }

    // 跳3天
    const jump3Btn = document.getElementById('test-jump-3');
    if (jump3Btn) {
      jump3Btn.addEventListener('click', () => {
        MockDate.jumpTo(MockDate.getOffset() + 3);
        this.updateDateDisplay();
        this.refreshAll();
        showToast(`📅 跳到 ${formatDateCN(MockDate.getDate())}`);
      });
    }

    // 跳7天
    const jump7Btn = document.getElementById('test-jump-7');
    if (jump7Btn) {
      jump7Btn.addEventListener('click', () => {
        MockDate.jumpTo(MockDate.getOffset() + 7);
        this.updateDateDisplay();
        this.refreshAll();
        showToast(`📅 跳到 ${formatDateCN(MockDate.getDate())}`);
      });
    }

    // 备份数据
    const backupBtn = document.getElementById('test-backup');
    if (backupBtn) {
      backupBtn.addEventListener('click', () => {
        this.backup();
      });
    }

    // 恢复数据
    const restoreBtn = document.getElementById('test-restore');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', () => {
        this.restore();
      });
    }

    // 回到今天
    const resetDateBtn = document.getElementById('test-reset-date');
    if (resetDateBtn) {
      resetDateBtn.addEventListener('click', () => {
        MockDate.reset();
        this.updateDateDisplay();
        this.refreshAll();
        showToast('📅 已回到今天');
      });
    }

    // 清除全部
    const resetAllBtn = document.getElementById('test-reset-all');
    if (resetAllBtn) {
      resetAllBtn.addEventListener('click', () => {
        if (confirm('确定要清除所有情绪数据吗？此操作不可恢复！')) {
          this.resetAll();
        }
      });
    }
  },

  /**
   * 更新日期显示
   */
  updateDateDisplay() {
    const dateEl = document.getElementById('test-current-date');
    const badgeEl = document.getElementById('test-mode-badge');
    if (dateEl) {
      dateEl.textContent = formatDateCN(MockDate.getDate());
    }
    if (badgeEl) {
      badgeEl.style.display = MockDate.isTestMode() ? 'inline-block' : 'none';
    }
  },

  /**
   * 刷新所有模块
   */
  refreshAll() {
    if (typeof CampusMap !== 'undefined') CampusMap.refresh();
  },

  /**
   * 备份所有情绪数据
   */
  backup() {
    this._backupData = {
      emotion_records: StorageManager.load('emotion_records'),
      emotion_custom_locations: StorageManager.load('emotion_custom_locations'),
      emotion_summaries: StorageManager.load('emotion_summaries'),
      emotion_achievements: StorageManager.load('emotion_achievements'),
      mockDateOffset: MockDate.getOffset(),
      timestamp: Date.now()
    };

    const restoreBtn = document.getElementById('test-restore');
    if (restoreBtn) restoreBtn.disabled = false;

    showToast('💾 数据已备份');
    console.log('📦 数据备份完成:', this._backupData);
  },

  /**
   * 恢复备份数据
   */
  restore() {
    if (!this._backupData) {
      showToast('⚠️ 没有备份数据');
      return;
    }

    if (!confirm('确定要恢复到备份时的数据吗？当前数据将被覆盖！')) return;

    StorageManager.save('emotion_records', this._backupData.emotion_records);
    StorageManager.save('emotion_custom_locations', this._backupData.emotion_custom_locations);
    StorageManager.save('emotion_summaries', this._backupData.emotion_summaries);
    StorageManager.save('emotion_achievements', this._backupData.emotion_achievements);

    // 恢复日期偏移
    MockDate.jumpTo(this._backupData.mockDateOffset || 0);
    this.updateDateDisplay();

    this.refreshAll();
    showToast('🔄 数据已恢复');
    console.log('✅ 数据恢复完成');
  },

  /**
   * 清除所有数据
   */
  resetAll() {
    MockDate.reset();
    this.updateDateDisplay();

    // 清除所有 emotion 相关数据
    const keys = Object.keys(localStorage).filter(k => k.startsWith('tools_emotion'));
    keys.forEach(k => localStorage.removeItem(k));

    this.refreshAll();
    showToast('🗑️ 所有数据已清除');
  }
};
