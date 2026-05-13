<template>
  <div class="calendar-page">
    <div class="page-header">
      <h2 class="page-title">分红日历</h2>
      <div class="month-nav">
        <van-icon name="arrow-left" @click="prevMonth" />
        <span class="current-month">{{ currentMonthLabel }}</span>
        <van-icon name="arrow" @click="nextMonth" />
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="calendar-container">
      <div class="weekday-row">
        <span v-for="day in weekdays" :key="day" class="weekday">{{ day }}</span>
      </div>
      <div class="calendar-grid">
        <div
          v-for="(day, idx) in calendarDays"
          :key="idx"
          class="calendar-day"
          :class="{
            'other-month': !day.isCurrentMonth,
            'has-dividend': day.dividends.length > 0,
            'today': day.isToday
          }"
        >
          <span class="day-number">{{ day.date }}</span>
          <div v-if="day.dividends.length > 0" class="dividend-dots">
            <span
              v-for="(d, i) in day.dividends.slice(0, 3)"
              :key="i"
              class="dot"
              :class="getDotClass(d)"
            ></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="legend">
      <div class="legend-item">
        <span class="dot confirmed"></span>
        <span>已到账</span>
      </div>
      <div class="legend-item">
        <span class="dot pending"></span>
        <span>待确认</span>
      </div>
      <div class="legend-item">
        <span class="dot announced"></span>
        <span>已公布</span>
      </div>
    </div>

    <!-- Selected Day Details -->
    <div v-if="selectedDay" class="day-details">
      <div class="details-header">
        <span class="details-date">{{ selectedDayLabel }}</span>
        <span class="total-amount gold-text">
          共 ¥ {{ formatAmount(selectedDayTotal) }}
        </span>
      </div>

      <div v-if="selectedDay.dividends.length === 0" class="no-data">
        暂无分红记录
      </div>

      <div v-else class="dividend-items">
        <div
          v-for="item in selectedDay.dividends"
          :key="item.id"
          class="dividend-item"
        >
          <div class="item-left">
            <span class="stock-name">{{ item.name }}</span>
            <span class="stock-symbol">{{ item.symbol }}</span>
          </div>
          <div class="item-center">
            <van-tag :type="getTagType(item)">
              {{ getStatusText(item) }}
            </van-tag>
          </div>
          <div class="item-right">
            <span class="amount gold-text">¥ {{ formatAmount(item.amount) }}</span>
            <van-button
              v-if="item.status === 'pending'"
              size="small"
              type="primary"
              @click="handleConfirm(item.id)"
              class="confirm-btn"
            >
              确认
            </van-button>
          </div>
        </div>
      </div>
    </div>

    <!-- All Records Toggle -->
    <div class="records-toggle">
      <van-tabs v-model:active="activeTab" @change="handleTabChange">
        <van-tab title="按日期" name="byDate"></van-tab>
        <van-tab title="全部记录" name="all"></van-tab>
      </van-tabs>
    </div>

    <!-- All Records List -->
    <div v-if="activeTab === 'all'" class="all-records">
      <div
        v-for="record in sortedRecords"
        :key="record.id"
        class="record-item"
      >
        <div class="record-left">
          <span class="stock-name">{{ record.name }}</span>
          <span class="stock-symbol">{{ record.symbol }}</span>
        </div>
        <div class="record-center">
          <span class="record-date">{{ record.exDate }}</span>
        </div>
        <div class="record-right">
          <span class="record-amount gold-text">¥ {{ formatAmount(record.amount) }}</span>
          <van-tag :type="getTagType(record)">
            {{ getStatusText(record) }}
          </van-tag>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'
import { usePortfolioStore } from '@/stores/portfolio'
import type { DividendRecord } from '@/types'
import dayjs from 'dayjs'

const portfolioStore = usePortfolioStore()

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const currentDate = ref(dayjs())
const selectedDay = ref<CalendarDay | null>(null)
const activeTab = ref('byDate')

interface CalendarDay {
  date: number
  month: number
  year: number
  isCurrentMonth: boolean
  isToday: boolean
  dividends: DividendRecord[]
}

const currentMonthLabel = computed(() => {
  return currentDate.value.format('YYYY年MM月')
})

const selectedDayLabel = computed(() => {
  if (!selectedDay.value) return ''
  return `${selectedDay.value.month + 1}月${selectedDay.value.date}日`
})

const selectedDayTotal = computed(() => {
  if (!selectedDay.value) return 0
  return selectedDay.value.dividends.reduce((sum, d) => sum + d.amount, 0)
})

const sortedRecords = computed(() => {
  return [...portfolioStore.dividendRecords].sort(
    (a, b) => new Date(b.exDate).getTime() - new Date(a.exDate).getTime()
  )
})

const calendarDays = computed((): CalendarDay[] => {
  const days: CalendarDay[] = []
  const startOfMonth = currentDate.value.startOf('month')
  const endOfMonth = currentDate.value.endOf('month')
  const startDay = startOfMonth.day()
  const daysInMonth = endOfMonth.date()
  const today = dayjs()

  // Previous month days
  const prevMonth = startOfMonth.subtract(1, 'month')
  const prevMonthDays = prevMonth.daysInMonth()
  for (let i = startDay - 1; i >= 0; i--) {
    const date = prevMonthDays - i
    days.push(createCalendarDay(date, prevMonth.month(), prevMonth.year(), false, today))
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(createCalendarDay(d, currentDate.value.month(), currentDate.value.year(), true, today))
  }

  // Next month days
  const remaining = 42 - days.length
  const nextMonth = startOfMonth.add(1, 'month')
  for (let d = 1; d <= remaining; d++) {
    days.push(createCalendarDay(d, nextMonth.month(), nextMonth.year(), false, today))
  }

  return days
})

function createCalendarDay(date: number, month: number, year: number, isCurrentMonth: boolean, today: dayjs.Dayjs): CalendarDay {
  const dateStr = dayjs(`${year}-${month + 1}-${date}`).format('YYYY-MM-DD')
  const dividends = portfolioStore.dividendRecords.filter(r => r.exDate === dateStr)
  return {
    date,
    month,
    year,
    isCurrentMonth,
    isToday: isCurrentMonth && date === today.date() && month === today.month() && year === today.year(),
    dividends
  }
}

function getDotClass(record: DividendRecord): string {
  if (record.status === 'confirmed') return 'confirmed'
  if (record.type === 'announced') return 'announced'
  return 'pending'
}

function getTagType(record: DividendRecord): 'success' | 'warning' | 'primary' {
  if (record.status === 'confirmed') return 'success'
  if (record.type === 'announced') return 'warning'
  return 'primary'
}

function getStatusText(record: DividendRecord): string {
  if (record.status === 'confirmed') return '已到账'
  if (record.type === 'announced') return '已公布'
  return '预估'
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function prevMonth() {
  currentDate.value = currentDate.value.subtract(1, 'month')
}

function nextMonth() {
  currentDate.value = currentDate.value.add(1, 'month')
}

function handleTabChange() {
  selectedDay.value = null
}

function handleConfirm(id: string) {
  portfolioStore.confirmDividend(id).then(() => {
    showToast('已确认到账')
    // Update selected day dividends
    if (selectedDay.value) {
      const record = selectedDay.value.dividends.find(d => d.id === id)
      if (record) record.status = 'confirmed'
    }
  }).catch(() => {
    showToast('操作失败')
  })
}

onMounted(() => {
  portfolioStore.fetchDividendRecords()
})
</script>

<style scoped>
.calendar-page {
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

.month-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-primary);
}

.current-month {
  font-size: 14px;
  min-width: 90px;
  text-align: center;
}

.calendar-container {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
}

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 8px;
}

.weekday {
  font-size: 12px;
  color: var(--text-secondary);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
}

.calendar-day.other-month {
  opacity: 0.3;
}

.calendar-day.has-dividend {
  background: rgba(212, 175, 55, 0.1);
}

.calendar-day.today {
  border: 1px solid var(--gold-primary);
}

.day-number {
  font-size: 14px;
  color: var(--text-primary);
}

.dividend-dots {
  display: flex;
  gap: 2px;
  margin-top: 2px;
}

.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
}

.dot.confirmed {
  background: var(--success);
}

.dot.pending {
  background: var(--warning);
}

.dot.announced {
  background: var(--gold-primary);
}

.legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.day-details {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.details-date {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.total-amount {
  font-size: 16px;
  font-weight: 600;
}

.no-data {
  text-align: center;
  color: var(--text-muted);
  padding: 20px;
}

.dividend-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dividend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.item-left {
  display: flex;
  flex-direction: column;
}

.item-center {
  flex: 1;
  text-align: center;
}

.item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.stock-name {
  font-size: 14px;
  color: var(--text-primary);
}

.stock-symbol {
  font-size: 12px;
  color: var(--text-muted);
}

.amount {
  font-size: 14px;
  font-weight: 600;
}

.confirm-btn {
  background: linear-gradient(135deg, var(--gold-primary), var(--gold-dark)) !important;
  border: none !important;
  color: var(--bg-primary) !important;
  font-size: 12px;
}

.records-toggle {
  margin-bottom: 12px;
}

.all-records {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.record-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.record-item:last-child {
  border-bottom: none;
}

.record-left {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.record-center {
  flex: 1;
  text-align: center;
}

.record-date {
  font-size: 13px;
  color: var(--text-secondary);
}

.record-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.record-amount {
  font-size: 14px;
  font-weight: 600;
}

.gold-text {
  color: var(--gold-primary);
}
</style>
