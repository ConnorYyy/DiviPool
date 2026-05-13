<template>
  <div class="profile-page">
    <div class="page-header">
      <h2 class="page-title">我的</h2>
    </div>

    <!-- User Info Card -->
    <div class="user-card gold-card">
      <div class="avatar">
        <van-icon name="user-o" size="40" color="var(--gold-primary)" />
      </div>
      <div class="user-info">
        <div class="user-name">{{ userStore.userInfo?.nickname || '用户' }}</div>
        <div class="user-phone">{{ formatPhone(userStore.userInfo?.phone || '') }}</div>
      </div>
      <van-button size="small" @click="showEditName = true" class="edit-btn">
        编辑
      </van-button>
    </div>

    <!-- Stats Overview -->
    <div class="stats-section">
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value">{{ portfolioStore.holdings.length }}</span>
          <span class="stat-label">持仓数</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ portfolioStore.dividendRecords.filter(d => d.status === 'confirmed').length }}</span>
          <span class="stat-label">已确认</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ portfolioStore.dividendRecords.filter(d => d.status === 'pending').length }}</span>
          <span class="stat-label">待确认</span>
        </div>
      </div>
    </div>

    <!-- Menu List -->
    <div class="menu-section">
      <van-cell-group inset>
        <van-cell title="账号安全" is-link @click="showSecurity = true">
          <template #icon>
            <van-icon name="shield-o" class="menu-icon" />
          </template>
        </van-cell>
        <van-cell title="数据导出" is-link @click="handleExport">
          <template #icon>
            <van-icon name="exchange" class="menu-icon" />
          </template>
        </van-cell>
        <van-cell title="订阅提醒" is-link @click="showSubscribe = true">
          <template #icon>
            <van-icon name="bell-o" class="menu-icon" />
          </template>
        </van-cell>
        <van-cell title="使用帮助" is-link @click="showHelp = true">
          <template #icon>
            <van-icon name="question-o" class="menu-icon" />
          </template>
        </van-cell>
        <van-cell title="关于我们" is-link @click="showAbout = true">
          <template #icon>
            <van-icon name="info-o" class="menu-icon" />
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- Logout Button -->
    <div class="logout-section">
      <van-button block type="default" @click="handleLogout" class="logout-btn">
        退出登录
      </van-button>
    </div>

    <!-- Version Info -->
    <div class="version-info">
      <span>DiviPool v1.0.0</span>
    </div>

    <!-- Edit Name Dialog -->
    <van-dialog v-model:show="showEditName" title="修改昵称" show-cancel-button @confirm="handleSaveName">
      <van-field v-model="tempName" placeholder="请输入昵称" />
    </van-dialog>

    <!-- Security Info -->
    <van-popup v-model:show="showSecurity" position="bottom" round>
      <div class="popup-content">
        <div class="popup-title">账号安全</div>
        <van-cell-group inset>
          <van-cell title="手机号" :value="formatPhone(userStore.userInfo?.phone || '')" />
          <van-cell title="注册时间" :value="formatDate(userStore.userInfo?.createdAt || '')"  />
        </van-cell-group>
      </div>
    </van-popup>

    <!-- About -->
    <van-popup v-model:show="showAbout" position="bottom" round>
      <div class="popup-content about-popup">
        <div class="about-logo">
          <span class="logo-text">DiviPool</span>
          <span class="logo-sub">聚息</span>
        </div>
        <p class="about-desc">让分红一目了然，轻松管理您的投资收益。</p>
        <p class="about-version">版本 1.0.0</p>
      </div>
    </van-popup>

    <!-- Help -->
    <van-popup v-model:show="showHelp" position="bottom" round>
      <div class="popup-content">
        <div class="popup-title">使用帮助</div>
        <div class="help-content">
          <h4>如何添加持仓？</h4>
          <p>进入"持仓"页面，点击"添加持仓"按钮，搜索或输入股票代码即可添加。</p>
          
          <h4>分红预估如何计算？</h4>
          <p>预估分红 = 持仓数量 × 每股分红。已公布的使用实际数据，未公布的用上年同期估算。</p>
          
          <h4>如何确认到账？</h4>
          <p>在首页或日历中找到待确认的分红记录，点击"确认到账"按钮即可。</p>
        </div>
      </div>
    </van-popup>

    <!-- Subscribe Settings -->
    <van-popup v-model:show="showSubscribe" position="bottom" round>
      <div class="popup-content">
        <div class="popup-title">订阅提醒</div>
        <van-cell-group inset>
          <van-cell title="分红日前提醒">
            <template #right-icon>
              <van-switch v-model="subscribeSettings.preDividend" size="20" />
            </template>
          </van-cell>
          <van-cell title="到账确认提醒">
            <template #right-icon>
              <van-switch v-model="subscribeSettings.onConfirm" size="20" />
            </template>
          </van-cell>
        </van-cell-group>
        <p class="subscribe-tip">提醒将在分红日前一天和确认时发送</p>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { useUserStore } from '@/stores/user'
import { usePortfolioStore } from '@/stores/portfolio'

const router = useRouter()
const userStore = useUserStore()
const portfolioStore = usePortfolioStore()

const showEditName = ref(false)
const showSecurity = ref(false)
const showAbout = ref(false)
const showHelp = ref(false)
const showSubscribe = ref(false)
const tempName = ref('')

const subscribeSettings = reactive({
  preDividend: true,
  onConfirm: true
})

function formatPhone(phone: string): string {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function handleSaveName() {
  if (tempName.value) {
    userStore.userInfo && (userStore.userInfo.nickname = tempName.value)
    showToast('保存成功')
  }
}

async function handleExport() {
  try {
    const data = {
      holdings: portfolioStore.holdings,
      dividends: portfolioStore.dividendRecords,
      exportTime: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `divipool-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('导出成功')
  } catch (e) {
    showToast('导出失败')
  }
}

async function handleLogout() {
  try {
    await showConfirmDialog({
      title: '确认退出',
      message: '确定要退出登录吗？'
    })
    userStore.logout()
    router.replace('/login')
  } catch (e) {
    // User cancelled
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: var(--bg-primary);
  padding: 16px;
  padding-bottom: 100px;
}

.page-header {
  margin-bottom: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.user-card {
  display: flex;
  align-items: center;
  padding: 20px;
  margin-bottom: 20px;
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.user-phone {
  font-size: 14px;
  color: var(--text-secondary);
}

.edit-btn {
  color: var(--gold-primary) !important;
}

.stats-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--gold-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--border-color);
}

.menu-section {
  margin-bottom: 20px;
}

:deep(.van-cell-group--inset) {
  margin: 0;
}

:deep(.van-cell) {
  background: var(--bg-card);
  color: var(--text-primary);
}

:deep(.van-cell::after) {
  border-color: var(--border-color);
}

.menu-icon {
  color: var(--gold-primary);
  margin-right: 12px;
  font-size: 18px;
}

.logout-section {
  margin-bottom: 20px;
}

.logout-btn {
  background: var(--bg-card) !important;
  border: 1px solid var(--error) !important;
  color: var(--error) !important;
}

.version-info {
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}

.popup-content {
  padding: 20px;
}

.popup-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  text-align: center;
}

.about-popup {
  text-align: center;
}

.about-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}

.logo-text {
  font-size: 28px;
  font-weight: bold;
  background: linear-gradient(135deg, var(--gold-light), var(--gold-primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.logo-sub {
  font-size: 18px;
  color: var(--gold-primary);
}

.about-desc {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 12px;
}

.about-version {
  color: var(--text-muted);
  font-size: 12px;
}

.help-content {
  padding: 0 8px;
}

.help-content h4 {
  color: var(--text-primary);
  font-size: 14px;
  margin: 16px 0 8px;
}

.help-content p {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.subscribe-tip {
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
  margin-top: 16px;
}
</style>
