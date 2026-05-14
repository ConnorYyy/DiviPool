<template>
  <div class="portfolio-page">
    <div class="page-header">
      <h2 class="page-title">我的持仓</h2>
      <van-button size="small" type="primary" @click="showAddModal = true" class="add-btn">
        添加持仓
      </van-button>
    </div>

    <!-- Stats Summary -->
    <div class="summary-card gold-card">
      <div class="summary-item">
        <span class="summary-label">持仓总数</span>
        <span class="summary-value">{{ portfolioStore.holdings.length }}</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-label">预估年化</span>
        <span class="summary-value gold-text">
          ¥ {{ formatAmount(portfolioStore.estimatedAnnualDividend) }}
        </span>
      </div>
    </div>

    <!-- Holdings List -->
    <div v-if="portfolioStore.holdings.length === 0" class="empty-state">
      <van-empty description="暂无持仓，点击添加开始管理">
        <van-button type="primary" @click="showAddModal = true">
          添加第一个持仓
        </van-button>
      </van-empty>
    </div>

    <div v-else class="holdings-list">
      <div
        v-for="holding in portfolioStore.holdings"
        :key="holding.id"
        class="holding-card"
      >
        <div class="holding-header">
          <div class="holding-title">
            <span class="stock-name">{{ holding.name }}</span>
            <van-tag :type="getTypeColor(holding.type)">
              {{ getTypeName(holding.type) }}
            </van-tag>
          </div>
          <van-icon name="arrow" class="arrow-icon" />
        </div>

        <div class="holding-details">
          <div class="detail-row">
            <span class="detail-label">代码</span>
            <span class="detail-value">{{ holding.symbol }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">持仓数量</span>
            <span class="detail-value">{{ holding.quantity }} 股</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">买入价</span>
            <span class="detail-value">¥ {{ holding.buyPrice.toFixed(2) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">当前价</span>
            <span class="detail-value">¥ {{ holding.currentPrice.toFixed(2) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">每股分红</span>
            <span class="detail-value gold-text">¥ {{ (holding.dividendPerShare || 0).toFixed(4) }}</span>
          </div>
        </div>

        <div class="holding-footer">
          <div class="estimated-dividend">
            预估年化收益: <span class="gold-text">¥ {{ formatAmount(holding.quantity * (holding.dividendPerShare || 0)) }}</span>
          </div>
          <div class="actions">
            <van-button size="small" @click="handleEdit(holding)">编辑</van-button>
            <van-button size="small" type="danger" @click="handleDelete(holding.id)">删除</van-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <van-popup v-model:show="showAddModal" position="bottom" round class="add-popup">
      <div class="popup-content">
        <div class="popup-header">
          <span class="popup-title">{{ editingHolding ? '编辑持仓' : '添加持仓' }}</span>
          <van-icon name="cross" @click="showAddModal = false" />
        </div>

        <!-- Search -->
        <van-search
          v-model="searchKeyword"
          placeholder="搜索股票代码或名称"
          @search="handleSearch"
          class="search-input"
        />

        <div v-if="searchResults.length > 0" class="search-results">
          <div
            v-for="stock in searchResults"
            :key="stock.symbol"
            class="search-item"
            @click="selectStock(stock)"
          >
            <span class="stock-name">{{ stock.name }}</span>
            <span class="stock-symbol">{{ stock.symbol }}</span>
          </div>
        </div>

        <!-- Form -->
        <van-form @submit="handleSubmit" class="holding-form">
          <van-cell-group inset>
            <van-field
              v-model="formData.symbol"
              label="代码"
              placeholder="股票代码"
              :readonly="!!editingHolding"
            />
            <van-field
              v-model="formData.name"
              label="名称"
              placeholder="股票名称"
              :readonly="!!editingHolding"
            />
            <van-field
              v-model.number="formData.type"
              label="类型"
              placeholder="A股/港股/美股/债基"
              readonly
              @click="showTypePicker = true"
            />
            <van-field
              v-model.number="formData.quantity"
              label="数量"
              type="number"
              placeholder="持仓数量（股）"
            />
            <van-field
              v-model.number="formData.buyPrice"
              label="买入价"
              type="number"
              placeholder="买入价格"
            />
            <van-field
              v-model.number="formData.currentPrice"
              label="当前价"
              type="number"
              placeholder="当前价格"
            />
            <van-field
              v-model.number="formData.dividendPerShare"
              label="每股分红"
              type="number"
              placeholder="每股分红金额"
            />
          </van-cell-group>

          <div class="form-actions">
            <van-button block type="primary" native-type="submit">
              {{ editingHolding ? '保存' : '添加' }}
            </van-button>
          </div>
        </van-form>
      </div>
    </van-popup>

    <!-- Type Picker -->
    <van-popup v-model:show="showTypePicker" position="bottom">
      <van-picker
        :columns="stockTypes"
        @confirm="handleTypeConfirm"
        @cancel="showTypePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { usePortfolioStore } from '@/stores/portfolio'
import { apiClient } from '@/api/client'
import type { Holding, StockInfo } from '@/types'

const portfolioStore = usePortfolioStore()

const showAddModal = ref(false)
const showTypePicker = ref(false)
const searchKeyword = ref('')
const searchResults = ref<StockInfo[]>([])
const editingHolding = ref<Holding | null>(null)

const formData = reactive({
  symbol: '',
  name: '',
  type: 'A' as Holding['type'],
  quantity: 0,
  buyPrice: 0,
  currentPrice: 0,
  dividendPerShare: 0
})

const stockTypes = [
  { text: 'A股', value: 'A' },
  { text: '港股', value: 'H' },
  { text: '美股', value: 'US' },
  { text: '债基', value: 'BOND' },
  { text: 'REITs', value: 'REITS' },
  { text: '其他', value: 'OTHER' }
]

function formatAmount(amount: number): string {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getTypeName(type: string): string {
  const map: Record<string, string> = {
    A: 'A股', H: '港股', US: '美股', BOND: '债基', REITS: 'REITs', OTHER: '其他'
  }
  return map[type] || type
}

function getTypeColor(type: string): 'primary' | 'success' | 'warning' | 'danger' | 'default' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'default'> = {
    A: 'primary', H: 'success', US: 'warning', BOND: 'default', REITS: 'danger', OTHER: 'default'
  }
  return map[type] || 'default'
}

async function handleSearch() {
  if (!searchKeyword.value) {
    searchResults.value = []
    return
  }
  searchResults.value = await apiClient.searchStocks(searchKeyword.value)
}

function selectStock(stock: StockInfo) {
  formData.symbol = stock.symbol
  formData.name = stock.name
  formData.type = stock.type
  searchResults.value = []
  searchKeyword.value = ''
}

function handleTypeConfirm({ selectedValues }: { selectedValues: string[] }) {
  formData.type = selectedValues[0] as Holding['type']
  showTypePicker.value = false
}

function handleEdit(holding: Holding) {
  editingHolding.value = holding
  Object.assign(formData, {
    symbol: holding.symbol,
    name: holding.name,
    type: holding.type,
    quantity: holding.quantity,
    buyPrice: holding.buyPrice,
    currentPrice: holding.currentPrice,
    dividendPerShare: holding.dividendPerShare
  })
  showAddModal.value = true
}

async function handleSubmit() {
  if (!formData.symbol || !formData.name) {
    showToast('请填写股票信息')
    return
  }
  if (formData.quantity <= 0) {
    showToast('请输入正确的数量')
    return
  }

  try {
    if (editingHolding.value) {
      await portfolioStore.updateHolding(editingHolding.value.id, formData)
      showToast('保存成功')
    } else {
      await portfolioStore.addHolding({
        userId: '',
        ...formData
      } as Omit<Holding, 'id'>)
      showToast('添加成功')
    }
    showAddModal.value = false
    resetForm()
  } catch (e) {
    showToast('操作失败')
  }
}

async function handleDelete(id: string) {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: '确定要删除这条持仓记录吗？'
    })
    await portfolioStore.deleteHolding(id)
    showToast('删除成功')
  } catch (e) {
    // User cancelled
  }
}

function resetForm() {
  editingHolding.value = null
  Object.assign(formData, {
    symbol: '',
    name: '',
    type: 'A',
    quantity: 0,
    buyPrice: 0,
    currentPrice: 0,
    dividendPerShare: 0
  })
}

onMounted(() => {
  portfolioStore.fetchHoldings()
})
</script>

<style scoped>
.portfolio-page {
  min-height: 100vh;
  background: var(--bg-primary);
  padding: 16px;
  padding-bottom: 100px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.add-btn {
  background: linear-gradient(135deg, var(--gold-primary), var(--gold-dark)) !important;
  border: none !important;
  color: var(--bg-primary) !important;
}

.summary-card {
  margin-bottom: 20px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
}

.summary-divider {
  width: 1px;
  background: var(--border-color);
}

.summary-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.summary-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.holdings-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.holding-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
}

.holding-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.holding-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stock-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.arrow-icon {
  color: var(--text-muted);
}

.holding-details {
  margin-bottom: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-color);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.detail-value {
  font-size: 13px;
  color: var(--text-primary);
}

.holding-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.estimated-dividend {
  font-size: 14px;
  color: var(--text-secondary);
}

.actions {
  display: flex;
  gap: 8px;
}

.add-popup {
  background: var(--bg-secondary);
  max-height: 85vh;
}

.popup-content {
  padding: 16px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.popup-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.search-input {
  background: var(--bg-card) !important;
  border-radius: 8px;
  margin-bottom: 12px;
}

.search-results {
  max-height: 200px;
  overflow-y: auto;
  background: var(--bg-card);
  border-radius: 8px;
  margin-bottom: 12px;
}

.search-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
}

.search-item:last-child {
  border-bottom: none;
}

.search-item:active {
  background: var(--bg-secondary);
}

.holding-form {
  margin-top: 12px;
}

:deep(.van-cell-group--inset) {
  margin: 0;
}

:deep(.van-field__label) {
  color: var(--text-secondary);
}

:deep(.van-field__control) {
  color: var(--text-primary);
}

.form-actions {
  margin-top: 24px;
  padding: 0 16px;
}

:deep(.van-button--primary) {
  background: linear-gradient(135deg, var(--gold-primary), var(--gold-dark)) !important;
  border: none !important;
  color: var(--bg-primary) !important;
}

.empty-state {
  text-align: center;
  padding: 60px 0;
}
</style>
