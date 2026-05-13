import type { Holding, DividendRecord, User, StockInfo } from '@/types'

// Local storage keys
const STORAGE_KEYS = {
  USERS: 'divipool_users',
  HOLDINGS: 'divipool_holdings',
  DIVIDENDS: 'divipool_dividends',
  CURRENT_USER: 'divipool_current_user'
}

// Mock data
const MOCK_STOCKS: StockInfo[] = [
  { symbol: '600519', name: '贵州茅台', type: 'A', exchange: 'SH' },
  { symbol: '000858', name: '五粮液', type: 'A', exchange: 'SZ' },
  { symbol: '601318', name: '中国平安', type: 'A', exchange: 'SH' },
  { symbol: '600036', name: '招商银行', type: 'A', exchange: 'SH' },
  { symbol: '0700.HK', name: '腾讯控股', type: 'H', exchange: 'HK' },
  { symbol: '9988.HK', name: '阿里巴巴', type: 'H', exchange: 'HK' },
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'US' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'US' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'US' },
  { symbol: 'KO', name: 'Coca-Cola Co.', type: 'US' },
  { symbol: '511010', name: '国债ETF', type: 'BOND' },
  { symbol: 'REITs', name: '鹏华前海万科REITs', type: 'REITS' }
]

// Helper functions
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

function delay(ms: number = 300): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getStoredData<T>(key: string, defaultValue: T): T {
  const stored = localStorage.getItem(key)
  if (!stored) return defaultValue
  try {
    return JSON.parse(stored)
  } catch {
    return defaultValue
  }
}

function setStoredData<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data))
}

// Mock API
export const mockApi = {
  // 发送验证码
  async sendCode(phone: string): Promise<{ success: boolean; message: string }> {
    await delay()
    console.log(`[Mock] Sending code to ${phone}: 123456`)
    return { success: true, message: '验证码已发送' }
  },

  // 登录
  async login(phone: string, code: string): Promise<{ token: string; user: User }> {
    await delay()
    
    if (code !== '123456') {
      throw new Error('验证码错误')
    }

    let users = getStoredData<Record<string, User>>(STORAGE_KEYS.USERS, {})
    let user = users[phone]
    
    if (!user) {
      // Auto register if not exists
      user = {
        id: generateId(),
        phone,
        nickname: `用户${phone.slice(-4)}`,
        createdAt: new Date().toISOString()
      }
      users[phone] = user
      setStoredData(STORAGE_KEYS.USERS, users)
    }

    const token = generateId()
    setStoredData(STORAGE_KEYS.CURRENT_USER, { token, userId: user.id, phone })
    
    return { token, user }
  },

  // 注册
  async register(phone: string, code: string): Promise<{ token: string; user: User }> {
    await delay()
    
    if (code !== '123456') {
      throw new Error('验证码错误')
    }

    let users = getStoredData<Record<string, User>>(STORAGE_KEYS.USERS, {})
    
    if (users[phone]) {
      throw new Error('该手机号已注册')
    }

    const user: User = {
      id: generateId(),
      phone,
      nickname: `用户${phone.slice(-4)}`,
      createdAt: new Date().toISOString()
    }
    users[phone] = user
    setStoredData(STORAGE_KEYS.USERS, users)

    const token = generateId()
    setStoredData(STORAGE_KEYS.CURRENT_USER, { token, userId: user.id, phone })
    
    return { token, user }
  },

  // 获取用户信息
  async getUserInfo(token: string): Promise<User> {
    await delay()
    const session = getStoredData<{ token: string; userId: string; phone: string } | null>(
      STORAGE_KEYS.CURRENT_USER, null
    )
    if (!session || session.token !== token) {
      throw new Error('未登录')
    }

    const users = getStoredData<Record<string, User>>(STORAGE_KEYS.USERS, {})
    const user = users[session.phone]
    if (!user) throw new Error('用户不存在')
    return user
  },

  // 搜索股票
  async searchStocks(keyword: string): Promise<StockInfo[]> {
    await delay(200)
    if (!keyword) return []
    const lower = keyword.toLowerCase()
    return MOCK_STOCKS.filter(
      s => s.symbol.toLowerCase().includes(lower) || s.name.includes(keyword)
    )
  },

  // 获取持仓列表
  async getHoldings(): Promise<Holding[]> {
    await delay()
    const holdings = getStoredData<Holding[]>(STORAGE_KEYS.HOLDINGS, [])
    const session = getStoredData<{ userId: string } | null>(STORAGE_KEYS.CURRENT_USER, null)
    if (!session) return []
    return holdings.filter(h => h.userId === session.userId)
  },

  // 添加持仓
  async addHolding(data: Omit<Holding, 'id'>): Promise<Holding> {
    await delay()
    const holdings = getStoredData<Holding[]>(STORAGE_KEYS.HOLDINGS, [])
    const newHolding: Holding = {
      ...data,
      id: generateId()
    }
    holdings.push(newHolding)
    setStoredData(STORAGE_KEYS.HOLDINGS, holdings)
    return newHolding
  },

  // 更新持仓
  async updateHolding(id: string, data: Partial<Holding>): Promise<Holding> {
    await delay()
    const holdings = getStoredData<Holding[]>(STORAGE_KEYS.HOLDINGS, [])
    const idx = holdings.findIndex(h => h.id === id)
    if (idx === -1) throw new Error('持仓不存在')
    holdings[idx] = { ...holdings[idx], ...data }
    setStoredData(STORAGE_KEYS.HOLDINGS, holdings)
    return holdings[idx]
  },

  // 删除持仓
  async deleteHolding(id: string): Promise<void> {
    await delay()
    const holdings = getStoredData<Holding[]>(STORAGE_KEYS.HOLDINGS, [])
    const filtered = holdings.filter(h => h.id !== id)
    setStoredData(STORAGE_KEYS.HOLDINGS, filtered)
  },

  // 获取分红记录
  async getDividendRecords(): Promise<DividendRecord[]> {
    await delay()
    const records = getStoredData<DividendRecord[]>(STORAGE_KEYS.DIVIDENDS, [])
    const session = getStoredData<{ userId: string } | null>(STORAGE_KEYS.CURRENT_USER, null)
    if (!session) return []
    return records.filter(r => r.userId === session.userId)
  },

  // 确认到账
  async confirmDividend(id: string): Promise<DividendRecord> {
    await delay()
    const records = getStoredData<DividendRecord[]>(STORAGE_KEYS.DIVIDENDS, [])
    const idx = records.findIndex(r => r.id === id)
    if (idx === -1) throw new Error('记录不存在')
    records[idx] = { ...records[idx], status: 'confirmed' }
    setStoredData(STORAGE_KEYS.DIVIDENDS, records)
    return records[idx]
  },

  // 刷新价格
  async refreshPrices(): Promise<Holding[]> {
    await delay(500)
    const holdings = getStoredData<Holding[]>(STORAGE_KEYS.HOLDINGS, [])
    const updated = holdings.map(h => ({
      ...h,
      currentPrice: h.currentPrice * (0.98 + Math.random() * 0.04),
      lastUpdated: new Date().toISOString()
    }))
    setStoredData(STORAGE_KEYS.HOLDINGS, updated)
    return updated
  },

  // 生成模拟分红记录
  async generateDividendRecords(holdings: Holding[]): Promise<void> {
    const records: DividendRecord[] = []
    const today = new Date()
    
    holdings.forEach(h => {
      // 为每只股票生成1-3条分红记录
      const count = Math.floor(Math.random() * 3) + 1
      for (let i = 0; i < count; i++) {
        const daysOffset = Math.floor(Math.random() * 60) - 10
        const exDate = new Date(today)
        exDate.setDate(exDate.getDate() + daysOffset)
        
        records.push({
          id: generateId(),
          userId: h.userId,
          symbol: h.symbol,
          name: h.name,
          amount: h.quantity * h.dividendPerShare,
          type: daysOffset < 0 ? 'confirmed' : (Math.random() > 0.5 ? 'announced' : 'estimated'),
          exDate: exDate.toISOString().split('T')[0],
          status: daysOffset < 0 ? 'confirmed' : 'pending'
        })
      }
    })
    
    const existing = getStoredData<DividendRecord[]>(STORAGE_KEYS.DIVIDENDS, [])
    const session = getStoredData<{ userId: string } | null>(STORAGE_KEYS.CURRENT_USER, null)
    if (session) {
      const userRecords = records.filter(r => r.userId === session.userId)
      const otherRecords = existing.filter(r => r.userId !== session.userId)
      setStoredData(STORAGE_KEYS.DIVIDENDS, [...otherRecords, ...userRecords])
    }
  }
}
