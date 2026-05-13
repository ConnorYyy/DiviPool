<template>
  <div class="home-page">
    <!-- Header -->
    <div class="header">
      <div class="greeting">
        <span class="time-wording">{{ timeWording }}</span>
        <span class="user-name">{{ userStore.userInfo?.nickname || '用户' }}</span>
      </div>
      <van-button size="small" :loading="refreshing" @click="handleRefresh" class="refresh-btn">
        {{ priceUpdated ? '价格已更新' : '刷新价格' }}
      </van-button>
    </div>

    <!-- Main Stats -->
    <div class="main-stats">
      <div class="annual-label">全年预估生息</div>
      <div class="annual-amount gold-gradient-text">
        ¥ {{ formatAmount(portfolioStore.estimatedAnnualDividend) }}
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">已确认到账</div>
        <div class="stat-value warning-text">
          ¥ {{ formatAmount(portfolioStore.confirmedDividend) }}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">待到账</div>
        <div class="stat-value success-text">
          ¥ {{ formatAmount(portfolioStore.pendingDividend) }}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">下一分红日</div>
        <div class="stat-value">
          {{ portfolioStore.nextDividendDate || '-' }}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">总市值</div>
        <div class="stat-value">
          ¥ {{ formatAmount(portfolioStore.totalMarketValue) }}
        </div>
      </div>
    </div>

    <!-- Upcoming Dividends -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">近期待到账</span>
        <van-button size="small" text @click="$router.push('/calendar')" class="more-btn" />
      </div>
      
      <div v-if="upcomingDividends.length === 0" class="empty-state">
        <van-empty description="暂无待到账分红" />
      </div>
      
      <div v-else class="dividend-list">
        <div
          v-for="item in upcomingDividends"
          :key="item.id"
          class="dividend-item"
        >
          <div class="dividend-left">
            <div class="stock-name">{{ item.name }}</div>
            <div class="stock-symbol">{{ item.symbol }}</div>
          </div>
          <div class="dividend-center">
            <div class="dividend-date">{{ formatDate(item.exDate) }}</div>
            <van-tag :type="item.type === 'confirmed' ? 'success' : 'warning'">
              {{ item.type === 'confirmed' ? '已到账' : '待确认' }}
            </van-tag>
          </div>
          <div class="dividend-right">
            <div class="dividend-amount gold-text">
              ¥ {{ formatAmount(item.amount) }}
            </div>
            <van-button
              v-if="item.status === 'pending'"
              size="small"
              type="primary"
              @click="handleConfirm(item.id)"
              class="confirm-btn"
            >
              确认到账
            </van-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Holdings Preview -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">我的持仓</span>
        <van-button size="small" text @click="$router.push('/portfolio')" class="more-btn" />
      </div>
      
      <div v-if="portfolioStore.holdings.length === 0" class="empty-state">
        <van-empty description="暂无持仓">
          <van-button size="small" type="primary" @click="$router.push('/portfolio')">
            添加持仓
          </van-button>
        </van-empty>
      </div>
      
      <div v-else class="holdings-preview">
        <div
          v-for="holding in portfolioStore.holdings.slice(0, 3)"
          :key="holding.id"
          class="holding-item"
        >
          <div class="holding-info">
            <span class="holding-name">{{ holding.name }}</span>
            <span class="holding-qty">{{ holding.quantity }}股</span>
          </div>
          <div class="holding-dividend gold-text">
            ¥ {{ formatAmount(holding.quantity * (holding.dividendPerShare || 0)) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'
import { useUserStore } from '@/stores/user'
import { usePortfolioStore } from '@/stores/portfolio'

const userStore = useUserStore()
const portfolioStore = usePortfolioStore()

const refreshing = ref(false)
const priceUpdated = ref(false)

const timeWording = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return '早上好，'
  if (hour < 18) return '下午好，'
  return '晚上好，'
})

const upcomingDividends = computed(() => {
  return portfolioStore.dividendRecords
    .filter(r => r.status === 'pending')
    .sort((a, b) => new Date(a.exDate).getTime() - new Date(b.exDate).getTime())
    .slice(0, 5)
})

function formatAmount(amount: number): string {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

async function handleRefresh() {
  refreshing.value = true
  try {
    await portfolioStore.refreshPrices()
    await portfolioStore.fetchDividendRecords()
    priceUpdated.value = true
    showToast('价格已更新')
  } catch (e) {
    showToast('刷新失败')
  } finally {
    refreshing.value = false
  }
}

async function handleConfirm(id: string) {
  try {
    await portfolioStore.confirmDividend(id)
    showToast('已确认到账')
  } catch (e) {
    showToast('操作失败')
  }
}

onMounted(async () => {
  if (userStore.isLoggedIn) {
    await portfolioStore.fetchHoldings()
    await portfolioStore.fetchDividendRecords()
    
    // Generate mock dividend records if empty
    if (portfolioStore.dividendRecords.length === 0 && portfolioStore.holdings.length > 0) {
      const { d1Api } = await import('@/api/d1')
      await d1Api.generateDividendRecords(portfolioStore.holdings)
      await portfolioStore.fetchDividendRecords()
    }
  }
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: var(--bg-primary);
  padding: 16px;
  padding-bottom: 100px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.greeting {
  display: flex;
  flex-direction: column;
}

.time-wording {
  font-size: 14px;
  color: var(--text-secondary);
}

.user-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.refresh-btn {
  background: var(--bg-card) !important;
  border: 1px solid var(--gold-dark) !important;
  color: var(--gold-primary) !important;
}

.main-stats {
  text-align: center;
  padding: 32px 0;
  margin-bottom: 24px;
  background: linear-gradient(135deg, var(--bg-card) 0%, #252525 100%);
  border: 1px solid var(--gold-dark);
  border-radius: 16px;
}

.annual-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.annual-amount {
  font-size: 42px;
  font-weight: bold;
}

.gold-gradient-text {
  background: linear-gradient(135deg, var(--gold-light), var(--gold-primary), var(--gold-dark));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.success-text { color: var(--success); }
.warning-text { color: var(--warning); }
.gold-text { color: var(--gold-primary); }

.section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.more-btn {
  color: var(--gold-primary) !important;
}

.dividend-list, .holdings-preview {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.dividend-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.dividend-item:last-child {
  border-bottom: none;
}

.dividend-left {
  flex: 1;
}

.stock-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.stock-symbol {
  font-size: 12px;
  color: var(--text-muted);
}

.dividend-center {
  text-align: center;
  margin: 0 16px;
}

.dividend-date {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.dividend-right {
  text-align: right;
  min-width: 100px;
}

.dividend-amount {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.confirm-btn {
  background: linear-gradient(135deg, var(--gold-primary), var(--gold-dark)) !important;
  border: none !important;
  color: var(--bg-primary) !important;
  font-size: 12px;
}

.holding-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.holding-item:last-child {
  border-bottom: none;
}

.holding-info {
  display: flex;
  flex-direction: column;
}

.holding-name {
  font-size: 14px;
  color: var(--text-primary);
}

.holding-qty {
  font-size: 12px;
  color: var(--text-muted);
}

.holding-dividend {
  font-size: 14px;
  font-weight: 600;
}

.empty-state {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
}
</style>
