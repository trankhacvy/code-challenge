# Problem 5: A Crude Server

A RESTful CRUD API for managing crypto tokens, built with Express + TypeScript + SQLite.

## Quick Start

```sh
npm install
npm run dev
```

Server starts at `http://localhost:3000`. Set `PORT` env var to change it.

The SQLite database (`data.db`) is created automatically on first run — no setup needed.

## Tech Choices

| Choice | Why |
|---|---|
| **SQLite** (better-sqlite3) | Real SQL database with zero setup — no Docker, no external service. File-based persistence. |
| **tsx** | Runs TypeScript directly, no build step |
| **No ORM** | Raw SQL is simpler for 5 endpoints and shows actual SQL knowledge |

## API

Base URL: `/api/v1`

### Create a token

```
POST /api/v1/tokens
Content-Type: application/json

{
  "name": "Ethereum",
  "symbol": "ETH",
  "price": 1645.93,
  "marketCap": 197000000000   // optional
}

→ 201 Created
{
  "data": { "id": 1, "name": "Ethereum", "symbol": "ETH", ... }
}
```

### List tokens

```
GET /api/v1/tokens?search=eth&sortBy=price&order=desc&page=1&limit=10

→ 200 OK
{
  "data": [ ... ],
  "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

| Param    | Default      | Options |
|----------|-------------|---------|
| `search` | —           | Searches name and symbol |
| `sortBy` | `createdAt` | `name`, `symbol`, `price`, `createdAt` |
| `order`  | `desc`      | `asc`, `desc` |
| `page`   | `1`         | Positive integer |
| `limit`  | `10`        | 1–100 |

### Get a token

```
GET /api/v1/tokens/:id

→ 200 OK
{ "data": { "id": 1, "name": "Ethereum", ... } }
```

### Update a token

```
PUT /api/v1/tokens/:id
Content-Type: application/json

{ "price": 1700.50 }    // partial update — only send fields to change

→ 200 OK
{ "data": { "id": 1, "price": 1700.50, ... } }
```

### Delete a token

```
DELETE /api/v1/tokens/:id

→ 204 No Content
```

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "price", "message": "Price must be a non-negative number" }
    ]
  }
}
```

| Status | Code | When |
|--------|------|------|
| `400`  | `VALIDATION_ERROR` | Invalid input fields |
| `400`  | `INVALID_ID` | Non-integer or negative ID |
| `404`  | `NOT_FOUND` | Token doesn't exist |
| `409`  | `CONFLICT` | Duplicate symbol |

## Project Structure

```
src/
  app.ts        — Express setup, routes, validation
  database.ts   — SQLite init, queries
  types.ts      — TypeScript interfaces (Token, API responses, errors)
```
