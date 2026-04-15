import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import type { Token, CreateTokenBody, UpdateTokenBody, ListTokensQuery, PaginationMeta } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data.db");

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    symbol     TEXT    NOT NULL UNIQUE,
    price      REAL    NOT NULL DEFAULT 0,
    market_cap REAL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

function rowToToken(row: any): Token {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    price: row.price,
    marketCap: row.market_cap,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ALLOWED_SORT_COLUMNS: Record<string, string> = {
  name: "name",
  symbol: "symbol",
  price: "price",
  createdAt: "created_at",
};

export function createToken(body: CreateTokenBody): Token {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO tokens (name, symbol, price, market_cap, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(body.name, body.symbol.toUpperCase(), body.price, body.marketCap ?? null, now, now);
  return getTokenById(result.lastInsertRowid as number)!;
}

export function listTokens(query: ListTokensQuery): { tokens: Token[]; pagination: PaginationMeta } {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 10));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (query.search) {
    conditions.push("(name LIKE ? OR symbol LIKE ?)");
    const search = `%${query.search}%`;
    params.push(search, search);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const sortColumn = ALLOWED_SORT_COLUMNS[query.sortBy ?? ""] ?? "created_at";
  const sortOrder = query.order === "asc" ? "ASC" : "DESC";

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM tokens ${where}`).get(...params) as any;
  const total = countRow.total;

  const rows = db.prepare(
    `SELECT * FROM tokens ${where} ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return {
    tokens: rows.map(rowToToken),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function getTokenById(id: number): Token | null {
  const row = db.prepare("SELECT * FROM tokens WHERE id = ?").get(id) as any;
  return row ? rowToToken(row) : null;
}

export function updateToken(id: number, body: UpdateTokenBody): Token | null {
  const existing = getTokenById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const name = body.name ?? existing.name;
  const symbol = body.symbol?.toUpperCase() ?? existing.symbol;
  const price = body.price ?? existing.price;
  const marketCap = body.marketCap !== undefined ? body.marketCap : existing.marketCap;

  db.prepare(`
    UPDATE tokens SET name = ?, symbol = ?, price = ?, market_cap = ?, updated_at = ?
    WHERE id = ?
  `).run(name, symbol, price, marketCap, now, id);

  return getTokenById(id);
}

export function deleteToken(id: number): boolean {
  const result = db.prepare("DELETE FROM tokens WHERE id = ?").run(id);
  return result.changes > 0;
}

export function symbolExists(symbol: string, excludeId?: number): boolean {
  const query = excludeId
    ? "SELECT 1 FROM tokens WHERE symbol = ? AND id != ?"
    : "SELECT 1 FROM tokens WHERE symbol = ?";
  const params = excludeId ? [symbol.toUpperCase(), excludeId] : [symbol.toUpperCase()];
  return !!db.prepare(query).get(...params);
}
