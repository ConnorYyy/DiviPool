-- DiviPool D1 Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Sessions table (token-based auth)
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Holdings table (portfolio positions)
CREATE TABLE IF NOT EXISTS holdings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity REAL NOT NULL,
  buy_price REAL NOT NULL,
  current_price REAL NOT NULL,
  dividend_per_share REAL NOT NULL DEFAULT 0,
  last_updated TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Dividend records table
CREATE TABLE IF NOT EXISTS dividend_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL,
  ex_date TEXT NOT NULL,
  pay_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_holdings_user ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_dividends_user ON dividend_records(user_id);
CREATE INDEX IF NOT EXISTS idx_dividends_status ON dividend_records(status);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
