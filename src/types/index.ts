export interface User {
  id: string
  phone: string
  nickname: string
  createdAt: string
}

export interface Holding {
  id: string
  userId: string
  symbol: string        // 标的代码
  name: string          // 标的名称
  type: 'A' | 'H' | 'US' | 'BOND' | 'REITS' | 'OTHER'  // A股/港股/美股/债基/REITs/其他
  quantity: number      // 持仓数量
  buyPrice: number      // 买入价
  currentPrice: number  // 当前价格
  dividendPerShare: number // 每股分红
  lastUpdated?: string  // 最后更新时间
}

export interface DividendRecord {
  id: string
  userId: string
  symbol: string
  name: string
  amount: number        // 分红金额
  type: 'announced' | 'estimated' | 'confirmed'  // 已公布/预估/已确认
  exDate: string        // 除权除息日
  payDate?: string      // 到账日
  status: 'pending' | 'confirmed'  // 待确认/已确认
}

export interface StockInfo {
  symbol: string
  name: string
  type: 'A' | 'H' | 'US' | 'BOND' | 'REITS' | 'OTHER'
  exchange?: string
}
