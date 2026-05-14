import type { User, Holding, DividendRecord, StockInfo } from '@/types'

const BASE_URL = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function request<T>(
  method: string,
  path: string,
  body?: any
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  const data = await res.json()
  if (!data.success) {
    throw new Error(data.error || 'Request failed')
  }
  return data.data
}

export const apiClient = {
  async sendCode(phone: string): Promise<{ success: boolean; message: string }> {
    return request('POST', '/api/auth/send-code', { phone })
  },

  async login(phone: string, code: string): Promise<{ token: string; user: User }> {
    return request('POST', '/api/auth/login', { phone, code })
  },

  async register(phone: string, code: string): Promise<{ token: string; user: User }> {
    return request('POST', '/api/auth/register', { phone, code })
  },

  async getUserInfo(): Promise<User> {
    return request('GET', '/api/user/info')
  },

  async searchStocks(keyword: string): Promise<StockInfo[]> {
    return request('GET', `/api/stocks/search?keyword=${encodeURIComponent(keyword)}`)
  },

  async getHoldings(): Promise<Holding[]> {
    return request('GET', '/api/holdings')
  },

  async addHolding(data: Omit<Holding, 'id'>): Promise<Holding> {
    return request('POST', '/api/holdings', data)
  },

  async updateHolding(id: string, data: Partial<Holding>): Promise<Holding> {
    return request('PUT', `/api/holdings/${id}`, data)
  },

  async deleteHolding(id: string): Promise<void> {
    return request('DELETE', `/api/holdings/${id}`)
  },

  async getDividendRecords(): Promise<DividendRecord[]> {
    return request('GET', '/api/dividends')
  },

  async confirmDividend(id: string): Promise<DividendRecord> {
    return request('POST', `/api/dividends/${id}/confirm`)
  },

  async refreshPrices(): Promise<Holding[]> {
    return request('POST', '/api/prices/refresh')
  },

  async generateDividendRecords(holdings: Holding[]): Promise<void> {
    return request('POST', '/api/dividends/generate', { holdings })
  }
}