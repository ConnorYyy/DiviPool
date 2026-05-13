import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { d1Api } from '@/api/d1'
import type { Holding, DividendRecord } from '@/types'

export const usePortfolioStore = defineStore('portfolio', () => {
  const holdings = ref<Holding[]>([])
  const dividendRecords = ref<DividendRecord[]>([])
  const loading = ref(false)

  // 计算全年预估生息
  const estimatedAnnualDividend = computed(() => {
    return holdings.value.reduce((sum, h) => {
      const dividend = h.dividendPerShare || 0
      return sum + h.quantity * dividend
    }, 0)
  })

  // 计算已确认到账总额
  const confirmedDividend = computed(() => {
    return dividendRecords.value
      .filter(r => r.status === 'confirmed')
      .reduce((sum, r) => sum + r.amount, 0)
  })

  // 计算待到账总额
  const pendingDividend = computed(() => {
    return dividendRecords.value
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0)
  })

  // 计算下一分红日
  const nextDividendDate = computed(() => {
    const pending = dividendRecords.value
      .filter(r => r.status === 'pending' && new Date(r.exDate) > new Date())
      .sort((a, b) => new Date(a.exDate).getTime() - new Date(b.exDate).getTime())
    return pending.length > 0 ? pending[0].exDate : null
  })

  // 计算总市值
  const totalMarketValue = computed(() => {
    return holdings.value.reduce((sum, h) => {
      return sum + h.quantity * (h.currentPrice || h.buyPrice)
    }, 0)
  })

  async function fetchHoldings() {
    loading.value = true
    try {
      holdings.value = await d1Api.getHoldings()
    } finally {
      loading.value = false
    }
  }

  async function addHolding(data: Omit<Holding, 'id'>) {
    const newHolding = await d1Api.addHolding(data)
    holdings.value.push(newHolding)
    return newHolding
  }

  async function updateHolding(id: string, data: Partial<Holding>) {
    const updated = await d1Api.updateHolding(id, data)
    const idx = holdings.value.findIndex(h => h.id === id)
    if (idx !== -1) {
      holdings.value[idx] = { ...holdings.value[idx], ...updated }
    }
    return updated
  }

  async function deleteHolding(id: string) {
    await d1Api.deleteHolding(id)
    holdings.value = holdings.value.filter(h => h.id !== id)
  }

  async function fetchDividendRecords() {
    loading.value = true
    try {
      dividendRecords.value = await d1Api.getDividendRecords()
    } finally {
      loading.value = false
    }
  }

  async function confirmDividend(id: string) {
    const updated = await d1Api.confirmDividend(id)
    const idx = dividendRecords.value.findIndex(r => r.id === id)
    if (idx !== -1) {
      dividendRecords.value[idx] = updated
    }
    return updated
  }

  async function refreshPrices() {
    // 模拟价格更新
    const updated = await d1Api.refreshPrices()
    holdings.value = updated
    return updated
  }

  return {
    holdings,
    dividendRecords,
    loading,
    estimatedAnnualDividend,
    confirmedDividend,
    pendingDividend,
    nextDividendDate,
    totalMarketValue,
    fetchHoldings,
    addHolding,
    updateHolding,
    deleteHolding,
    fetchDividendRecords,
    confirmDividend,
    refreshPrices
  }
})
