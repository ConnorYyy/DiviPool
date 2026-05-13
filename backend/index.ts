import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { BearerAuth } from 'hono/bearer-auth'
import { SignJWT, jwtVerify } from 'hono/jwt'

type Env = {
  DB: D1Database
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  JWT_SECRET: string
}

type Variables = {
  userId: string
  phone: string
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// JWT secret fallback
const getJwtSecret = (c: any) => c.env.JWT_SECRET || 'divipool-dev-secret-key-min-32-chars'

// Auth middleware
async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: '未授权' }, 401)
  }

  const token = authHeader.slice(7)
  try {
    const secret = getJwtSecret(c)
    const payload = await jwtVerify(token, secret)
    c.set('userId', payload.payload.sub as string)
    c.set('phone', payload.payload.phone as string)
    await next()
  } catch (err) {
    return c.json({ success: false, error: 'Token无效' }, 401)
  }
}

// Helper: generate JWT
async function generateToken(userId: string, phone: string, secret: string): Promise<string> {
  return new SignJWT({ phone })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(new TextEncoder().encode(secret))
}

// Helper: generate ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// ============ AUTH ROUTES ============

app.post('/api/auth/send-code', async (c) => {
  const { phone } = await c.req.json()
  // In production this would send SMS. Here we just log.
  console.log(`[Auth] Sending code to ${phone}: 123456`)
  return c.json({ success: true, message: '验证码已发送' })
})

app.post('/api/auth/login', async (c) => {
  const { phone, code } = await c.req.json()

  if (code !== '123456') {
    return c.json({ success: false, error: '验证码错误' }, 400)
  }

  const stmt = c.env.DB.prepare('SELECT * FROM users WHERE phone = ?')
  const { results: users } = await stmt.bind(phone).all()

  let user: any
  if (users.length === 0) {
    user = {
      id: generateId(),
      phone,
      nickname: `用户${phone.slice(-4)}`,
      createdAt: new Date().toISOString()
    }
    await c.env.DB.prepare(
      'INSERT INTO users (id, phone, nickname, created_at) VALUES (?, ?, ?, ?)'
    ).bind(user.id, user.phone, user.nickname, user.createdAt).run()
  } else {
    const u = users[0] as any
    user = { id: u.id, phone: u.phone, nickname: u.nickname, createdAt: u.created_at }
  }

  const secret = getJwtSecret(c)
  const token = await generateToken(user.id, user.phone, secret)

  await c.env.DB.prepare(
    'INSERT INTO sessions (token, user_id, phone, created_at) VALUES (?, ?, ?, ?)'
  ).bind(token, user.id, user.phone, new Date().toISOString()).run()

  return c.json({ success: true, data: { token, user } })
})

app.post('/api/auth/register', async (c) => {
  const { phone, code } = await c.req.json()

  if (code !== '123456') {
    return c.json({ success: false, error: '验证码错误' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE phone = ?').bind(phone).all()
  if ((existing.results as any[]).length > 0) {
    return c.json({ success: false, error: '该手机号已注册' }, 400)
  }

  const user = {
    id: generateId(),
    phone,
    nickname: `用户${phone.slice(-4)}`,
    createdAt: new Date().toISOString()
  }

  await c.env.DB.prepare(
    'INSERT INTO users (id, phone, nickname, created_at) VALUES (?, ?, ?, ?)'
  ).bind(user.id, user.phone, user.nickname, user.createdAt).run()

  const secret = getJwtSecret(c)
  const token = await generateToken(user.id, user.phone, secret)

  await c.env.DB.prepare(
    'INSERT INTO sessions (token, user_id, phone, created_at) VALUES (?, ?, ?, ?)'
  ).bind(token, user.id, user.phone, new Date().toISOString()).run()

  return c.json({ success: true, data: { token, user } })
})

// ============ USER ROUTES ============

app.get('/api/user/info', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { results: users } = await c.env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(userId).all()

  if ((users as any[]).length === 0) {
    return c.json({ success: false, error: '用户不存在' }, 404)
  }

  const u = users[0] as any
  return c.json({
    success: true,
    data: { id: u.id, phone: u.phone, nickname: u.nickname, createdAt: u.created_at }
  })
})

// ============ STOCK SEARCH ============

const MOCK_STOCKS = [
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

app.get('/api/stocks/search', authMiddleware, async (c) => {
  const keyword = c.req.query('keyword') || ''
  if (!keyword) return c.json({ success: true, data: [] })

  const lower = keyword.toLowerCase()
  const results = MOCK_STOCKS.filter(
    s => s.symbol.toLowerCase().includes(lower) || s.name.includes(keyword)
  )
  return c.json({ success: true, data: results })
})

// ============ HOLDINGS ROUTES ============

app.get('/api/holdings', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { results: rows } = await c.env.DB.prepare(
    'SELECT * FROM holdings WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all()

  const holdings = (rows as any[]).map(r => ({
    id: r.id,
    userId: r.user_id,
    symbol: r.symbol,
    name: r.name,
    type: r.type,
    quantity: r.quantity,
    buyPrice: r.buy_price,
    currentPrice: r.current_price,
    dividendPerShare: r.dividend_per_share,
    lastUpdated: r.last_updated,
  }))

  return c.json({ success: true, data: holdings })
})

app.post('/api/holdings', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const data = await c.req.json()

  const id = generateId()
  const createdAt = new Date().toISOString()

  await c.env.DB.prepare(
    `INSERT INTO holdings (id, user_id, symbol, name, type, quantity, buy_price, current_price, dividend_per_share, last_updated, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, userId, data.symbol, data.name, data.type, data.quantity,
    data.buyPrice, data.currentPrice, data.dividendPerShare || 0, data.lastUpdated || null, createdAt
  ).run()

  return c.json({
    success: true,
    data: { id, userId, ...data }
  })
})

app.put('/api/holdings/:id', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const data = await c.req.json()
  const userId = c.get('userId')

  const fields: string[] = []
  const values: any[] = []

  if (data.symbol !== undefined) { fields.push('symbol = ?'); values.push(data.symbol) }
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type) }
  if (data.quantity !== undefined) { fields.push('quantity = ?'); values.push(data.quantity) }
  if (data.buyPrice !== undefined) { fields.push('buy_price = ?'); values.push(data.buyPrice) }
  if (data.currentPrice !== undefined) { fields.push('current_price = ?'); values.push(data.currentPrice) }
  if (data.dividendPerShare !== undefined) { fields.push('dividend_per_share = ?'); values.push(data.dividendPerShare) }
  if (data.lastUpdated !== undefined) { fields.push('last_updated = ?'); values.push(data.lastUpdated) }

  if (fields.length > 0) {
    values.push(id, userId)
    await c.env.DB.prepare(`UPDATE holdings SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).bind(...values).run()
  }

  const { results: rows } = await c.env.DB.prepare('SELECT * FROM holdings WHERE id = ? AND user_id = ?').bind(id, userId).all()
  if ((rows as any[]).length === 0) {
    return c.json({ success: false, error: '持仓不存在' }, 404)
  }

  const r = rows[0] as any
  return c.json({
    success: true,
    data: {
      id: r.id, userId: r.user_id, symbol: r.symbol, name: r.name, type: r.type,
      quantity: r.quantity, buyPrice: r.buy_price, currentPrice: r.current_price,
      dividendPerShare: r.dividend_per_share, lastUpdated: r.last_updated
    }
  })
})

app.delete('/api/holdings/:id', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId')
  await c.env.DB.prepare('DELETE FROM holdings WHERE id = ? AND user_id = ?').bind(id, userId).run()
  return c.json({ success: true })
})

// ============ DIVIDEND ROUTES ============

app.get('/api/dividends', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { results: rows } = await c.env.DB.prepare(
    'SELECT * FROM dividend_records WHERE user_id = ? ORDER BY ex_date DESC'
  ).bind(userId).all()

  const records = (rows as any[]).map(r => ({
    id: r.id, userId: r.user_id, symbol: r.symbol, name: r.name,
    amount: r.amount, type: r.type,
    exDate: r.ex_date, payDate: r.pay_date || undefined,
    status: r.status
  }))

  return c.json({ success: true, data: records })
})

app.post('/api/dividends/:id/confirm', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId')

  await c.env.DB.prepare('UPDATE dividend_records SET status = ? WHERE id = ? AND user_id = ?')
    .bind('confirmed', id, userId).run()

  const { results: rows } = await c.env.DB.prepare('SELECT * FROM dividend_records WHERE id = ? AND user_id = ?').bind(id, userId).all()
  if ((rows as any[]).length === 0) {
    return c.json({ success: false, error: '记录不存在' }, 404)
  }

  const r = rows[0] as any
  return c.json({
    success: true,
    data: {
      id: r.id, userId: r.user_id, symbol: r.symbol, name: r.name,
      amount: r.amount, type: r.type, exDate: r.ex_date, payDate: r.pay_date,
      status: r.status
    }
  })
})

app.post('/api/prices/refresh', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { results: rows } = await c.env.DB.prepare('SELECT * FROM holdings WHERE user_id = ?').bind(userId).all()

  const holdings = rows as any[]
  const now = new Date().toISOString()
  const updated: any[] = []

  for (const h of holdings) {
    const newPrice = h.current_price * (0.98 + Math.random() * 0.04)
    await c.env.DB.prepare('UPDATE holdings SET current_price = ?, last_updated = ? WHERE id = ?')
      .bind(newPrice, now, h.id).run()
    updated.push({
      id: h.id, userId: h.user_id, symbol: h.symbol, name: h.name, type: h.type,
      quantity: h.quantity, buyPrice: h.buy_price, currentPrice: newPrice,
      dividendPerShare: h.dividend_per_share, lastUpdated: now
    })
  }

  return c.json({ success: true, data: updated })
})

app.post('/api/dividends/generate', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { holdings } = await c.req.json() as { holdings: any[] }

  const today = new Date()
  for (const h of holdings) {
    const count = Math.floor(Math.random() * 3) + 1
    for (let i = 0; i < count; i++) {
      const daysOffset = Math.floor(Math.random() * 60) - 10
      const exDate = new Date(today)
      exDate.setDate(exDate.getDate() + daysOffset)
      const amount = h.quantity * (h.dividendPerShare || 0)
      const type = daysOffset < 0 ? 'confirmed' : (Math.random() > 0.5 ? 'announced' : 'estimated')
      const status: 'pending' | 'confirmed' = daysOffset < 0 ? 'confirmed' : 'pending'

      await c.env.DB.prepare(
        `INSERT INTO dividend_records (id, user_id, symbol, name, amount, type, ex_date, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        generateId(), userId, h.symbol, h.name, amount, type,
        exDate.toISOString().split('T')[0], status, new Date().toISOString()
      ).run()
    }
  }

  return c.json({ success: true })
})

// ============ SPA FALLBACK ============

app.get('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw)
})

export default app