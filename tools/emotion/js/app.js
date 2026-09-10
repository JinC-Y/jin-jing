/* ========================================
   情绪模块主逻辑入口
   负责初始化、页面导航、各模块协调
   ======================================== */

const EmotionApp = {
  currentTab: 'map',

  /**
   * 初始化应用
   */
  init() {
    console.log('🎓 情绪地图模块初始化中...');

    try {
      // 初始化各模块
      EmotionRecorder.init();
      LocationManager.init();
      EmotionDiary.init();
      Achievements.init();
      TestTools.init();

      // 初始化地图
      CampusMap.init('map-container');

      // 绑定导航事件
      this.bindNavigation();

      // 绑定添加地点按钮
      this.bindAddLocation();

      // 绑定总结按钮
      this.bindSummaryButtons();

      // 渲染初始页面
      this.switchTab('map');

      // 检查成就
      Achievements.checkAll(EmotionRecorder.records);

      console.log('✅ 情绪地图模块初始化完成');
    } catch (error) {
      console.error('❌ 初始化失败:', error);
    }
  },

  /**
   * 绑定导航事件
   */
  bindNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });
  },

  /**
   * 切换标签页
   * @param {string} tab - 标签名
   */
  switchTab(tab) {
    this.currentTab = tab;

    // 更新导航按钮状态
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // 隐藏所有内容区
    document.querySelectorAll('.tab-content').forEach(el => {
      el.style.display = 'none';
    });

    // 显示目标内容区
    const target = document.getElementById(`tab-${tab}`);
    if (target) {
      target.style.display = 'block';
    }

    // 渲染对应内容
    switch (tab) {
      case 'map':
        CampusMap.render();
        break;
      case 'timeline':
        EmotionTimeline.init();
        break;
      case 'diary':
        this.renderDiaryTab();
        break;
      case 'wall':
        ExpressionWall.render();
        break;
      case 'achievements':
        Achievements.render();
        break;
    }
  },

  /**
   * 渲染回忆录标签页
   */
  renderDiaryTab() {
    const container = document.getElementById('tab-diary');
    if (!container) return;

    // 渲染图表
    EmotionCharts.drawWeeklyTrend('weekly-trend-chart');

    // 今天的情绪分布
    const today = formatDate(new Date());
    const todayDist = EmotionRecorder.getDayMoodDistribution(today);
    EmotionCharts.drawMoodDistribution('today-distribution', todayDist);

    // 地点对比
    EmotionCharts.drawLocationComparison('location-comparison');
  },

  /**
   * 绑定添加地点按钮
   */
  bindAddLocation() {
    const addBtn = document.getElementById('add-location-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        LocationManager.showAddModal();
      });
    }
  },

  /**
   * 绑定总结按钮
   */
  bindSummaryButtons() {
    // 日总结按钮
    const dailyBtn = document.getElementById('generate-daily-btn');
    if (dailyBtn) {
      dailyBtn.addEventListener('click', async () => {
        dailyBtn.disabled = true;
        dailyBtn.innerHTML = '<span class="loading"></span> AI 生成中...';

        try {
          const summary = await EmotionDiary.generateDailySummary();
          const display = document.getElementById('daily-summary-display');
          if (display) {
            display.innerHTML = EmotionDiary.renderSummaryCard({
              type: 'daily',
              date: formatDate(new Date()),
              content: summary,
              createdAt: Date.now()
            });
          }
          showToast('日总结已生成 ✨');
        } catch (error) {
          showToast('生成失败，请稍后重试 😥');
        }

        dailyBtn.disabled = false;
        dailyBtn.textContent = '📅 生成今日总结';
      });
    }

    // 周总结按钮
    const weeklyBtn = document.getElementById('generate-weekly-btn');
    if (weeklyBtn) {
      weeklyBtn.addEventListener('click', async () => {
        weeklyBtn.disabled = true;
        weeklyBtn.innerHTML = '<span class="loading"></span> AI 生成中...';

        try {
          const summary = await EmotionDiary.generateWeeklySummary();
          const display = document.getElementById('weekly-summary-display');
          if (display) {
            display.innerHTML = EmotionDiary.renderSummaryCard({
              type: 'weekly',
              startDate: getWeekRange().start,
              endDate: getWeekRange().end,
              content: summary,
              createdAt: Date.now()
            });
          }
          showToast('周总结已生成 📊');
        } catch (error) {
          showToast('生成失败，请稍后重试 😥');
        }

        weeklyBtn.disabled = false;
        weeklyBtn.textContent = '📊 生成本周总结';
      });
    }
  }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  EmotionApp.init();
});
