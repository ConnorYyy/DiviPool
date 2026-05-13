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
    return request('/api/auth/send-code', 'POST', { phone })
  },

  async login(phone: string, code: string): Promise<{ token: string; user: User }> {
    return request('/api/auth/login', 'POST', { phone, code })
  },

  async register(phone: string, code: string): Promise<{ token: string; user: User }> {
    return request('/api/auth/register', 'POST', { phone, code })
  },

  async getUserInfo(): Promise<User> {
    return request('/api/user/info', 'GET')
  },

  async searchStocks(keyword: string): Promise<StockInfo[]> {
    return request(`/api/stocks/search?keyword=${encodeURIComponent(keyword)}`, 'GET')
  },

  async getHoldings(): Promise<Holding[]> {
    return request('/api/holdings', 'GET')
  },

  async addHolding(data: Omit<Holding, 'id'>): Promise<Holding> {
    return request('/api/holdings', 'POST', data)
  },

  async updateHolding(id: string, data: Partial<Holding>): Promise<Holding> {
    return request(`/api/holdings/${id}`, 'PUT', data)
  },

  async deleteHolding(id: string): Promise<void> {
    return request(`/api/holdings/${id}`, 'DELETE')
  },

  async getDividendRecords(): Promise<DividendRecord[]> {
    return request('/api/dividends', 'GET')
  },

  async confirmDividend(id: string): Promise<DividendRecord> {
    return request(`/api/dividends/${id}/confirm`, 'POST')
  },

  async refreshPrices(): Promise<Holding[]> {
    return request('/api/prices/refresh', 'POST')
  },

  async generateDividendRecords(holdings: Holding[]): Promise<void> {
    return request('/api/dividends/generate', 'POST', { holdings })
  }
}