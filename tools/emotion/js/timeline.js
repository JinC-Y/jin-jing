/* ========================================
   情绪时间轴模块
   像朋友圈一样滑动浏览历史情绪记录
   ======================================== */

const EmotionTimeline = {
  containerId: 'timeline-section',
  pageSize: 7,
  currentPage: 0,

  /**
   * 初始化
   */
  init() {
    this.render();
  },

  /**
   * 按日期分组记录
   */
  groupByDate(records) {
    const groups = {};
    records.forEach(r => {
      const date = formatDate(r.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(r);
    });

    // 按日期倒序排列
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]));
  },

  /**
   * 渲染时间轴
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const allRecords = EmotionRecorder.records.sort((a, b) => b.timestamp - a.timestamp);
    const grouped = this.groupByDate(allRecords);
    const totalPages = Math.ceil(grouped.length / this.pageSize);
    const pageData = grouped.slice(
      this.currentPage * this.pageSize,
      (this.currentPage + 1) * this.pageSize
    );

    if (grouped.length === 0) {
      container.innerHTML = `
        <div class="timeline-empty">
          <div class="timeline-empty-icon">📝</div>
          <p>还没有情绪记录</p>
          <p class="timeline-empty-hint">点击地图上的地点，开始记录你的心情吧！</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="timeline-header">
        <h3 class="timeline-title">🕐 情绪时间轴</h3>
        <div class="timeline-pagination">
          <button class="btn-sm btn-secondary" ${this.currentPage === 0 ? 'disabled' : ''}
                  id="timeline-prev">← 上一页</button>
          <span class="timeline-page-info">${this.currentPage + 1} / ${totalPages}</span>
          <button class="btn-sm btn-secondary" ${this.currentPage >= totalPages - 1 ? 'disabled' : ''}
                  id="timeline-next">下一页 →</button>
        </div>
      </div>
      <div class="timeline-container">
        <div class="timeline-line"></div>
        ${pageData.map(([date, records]) => this.renderDayGroup(date, records)).join('')}
      </div>
    `;

    this.bindPagination(totalPages);
  },

  /**
   * 渲染一天的记录组
   */
  renderDayGroup(dateStr, records) {
    const d = new Date(dateStr);
    const dateCN = formatDateCN(d);
    const avgMood = records.reduce((s, r) => s + r.mood, 0) / records.length;
    const moodInfo = this.getMoodInfo(avgMood);
    const isToday = dateStr === formatDate(new Date());

    return `
      <div class="timeline-day ${isToday ? 'is-today' : ''}">
        <div class="timeline-dot" style="background: ${moodInfo.cssColor}"></div>
        <div class="timeline-card card">
          <div class="timeline-card-header">
            <span class="timeline-date">${isToday ? '📌 今天' : dateCN}</span>
            <span class="timeline-avg-mood" style="color: ${moodInfo.cssColor}">
              ${moodInfo.emoji} ${avgMood.toFixed(1)}
            </span>
          </div>
          <div class="timeline-records">
            ${records.map(r => this.renderRecord(r)).join('')}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * 渲染单条记录
   */
  renderRecord(record) {
    const moodInfo = this.getMoodInfo(record.mood);
    const locName = EmotionRecorder.getLocationName(record.locationId);
    const time = new Date(record.timestamp);
    const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

    return `
      <div class="timeline-record">
        <span class="timeline-record-emoji">${moodInfo.emoji}</span>
        <div class="timeline-record-info">
          <span class="timeline-record-location">📍 ${locName}</span>
          <span class="timeline-record-time">${timeStr}</span>
        </div>
        ${record.note ? `<span class="timeline-record-note">"${record.note}"</span>` : ''}
      </div>
    `;
  },

  /**
   * 获取情绪信息
   */
  getMoodInfo(mood) {
    if (mood >= 4.5) return { emoji: '😊', label: '开心', cssColor: '#51CF66' };
    if (mood >= 3.5) return { emoji: '😌', label: '平静', cssColor: '#4A90D9' };
    if (mood >= 2.5) return { emoji: '😐', label: '一般', cssColor: '#FFD43B' };
    if (mood >= 1.5) return { emoji: '😟', label: '焦虑', cssColor: '#FF922B' };
    return { emoji: '😢', label: '低落', cssColor: '#FF6B6B' };
  },

  /**
   * 绑定分页事件
   */
  bindPagination(totalPages) {
    const prevBtn = document.getElementById('timeline-prev');
    const nextBtn = document.getElementById('timeline-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentPage > 0) {
          this.currentPage--;
          this.render();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.currentPage < totalPages - 1) {
          this.currentPage++;
          this.render();
        }
      });
    }
  },

  /**
   * 刷新
   */
  refresh() {
    this.currentPage = 0;
    this.render();
  }
};
