import express from "express";
import type { Request, Response } from "express";
import * as db from "./database.js";
import type {
  CreateTokenBody,
  UpdateTokenBody,
  ListTokensQuery,
  FieldError,
  ApiSuccessResponse,
  ApiListResponse,
  ApiErrorResponse,
  Token,
} from "./types.js";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

// Response helpers
function success<T>(res: Response, data: T, status = 200) {
  const body: ApiSuccessResponse<T> = { data };
  res.status(status).json(body);
}

function listResponse<T>(res: Response, data: T[], pagination: any) {
  const body: ApiListResponse<T> = { data, pagination };
  res.json(body);
}

function errorResponse(res: Response, status: number, code: string, message: string, details?: FieldError[]) {
  const body: ApiErrorResponse = { error: { code, message, ...(details ? { details } : {}) } };
  res.status(status).json(body);
}

// Validation helpers
function validateCreateToken(body: any): FieldError[] {
  const errors: FieldError[] = [];
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    errors.push({ field: "name", message: "Name is required" });
  }
  if (!body.symbol || typeof body.symbol !== "string" || !body.symbol.trim()) {
    errors.push({ field: "symbol", message: "Symbol is required" });
  }
  if (body.price === undefined || typeof body.price !== "number" || body.price < 0) {
    errors.push({ field: "price", message: "Price must be a non-negative number" });
  }
  if (body.marketCap !== undefined && body.marketCap !== null) {
    if (typeof body.marketCap !== "number" || body.marketCap < 0) {
      errors.push({ field: "marketCap", message: "Market cap must be a non-negative number or null" });
    }
  }
  return errors;
}

function validateUpdateToken(body: any): FieldError[] {
  const errors: FieldError[] = [];
  if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) {
    errors.push({ field: "name", message: "Name must be a non-empty string" });
  }
  if (body.symbol !== undefined && (typeof body.symbol !== "string" || !body.symbol.trim())) {
    errors.push({ field: "symbol", message: "Symbol must be a non-empty string" });
  }
  if (body.price !== undefined && (typeof body.price !== "number" || body.price < 0)) {
    errors.push({ field: "price", message: "Price must be a non-negative number" });
  }
  if (body.marketCap !== undefined && body.marketCap !== null) {
    if (typeof body.marketCap !== "number" || body.marketCap < 0) {
      errors.push({ field: "marketCap", message: "Market cap must be a non-negative number or null" });
    }
  }
  return errors;
}

function parseId(param: string): number | null {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Routes: /api/v1/tokens

// POST /api/v1/tokens — Create a token
app.post("/api/v1/tokens", (req: Request, res: Response) => {
  const errors = validateCreateToken(req.body);
  if (errors.length) {
    return errorResponse(res, 400, "VALIDATION_ERROR", "Validation failed", errors);
  }

  const body: CreateTokenBody = {
    name: req.body.name.trim(),
    symbol: req.body.symbol.trim(),
    price: req.body.price,
    marketCap: req.body.marketCap ?? null,
  };

  if (db.symbolExists(body.symbol)) {
    return errorResponse(res, 409, "CONFLICT", `Token with symbol "${body.symbol.toUpperCase()}" already exists`);
  }

  const token = db.createToken(body);
  success(res, token, 201);
});

// GET /api/v1/tokens — List tokens with filters + pagination
app.get("/api/v1/tokens", (req: Request, res: Response) => {
  const query: ListTokensQuery = {
    search: req.query.search as string | undefined,
    sortBy: req.query.sortBy as ListTokensQuery["sortBy"],
    order: req.query.order as ListTokensQuery["order"],
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  };

  const { tokens, pagination } = db.listTokens(query);
  listResponse(res, tokens, pagination);
});

// GET /api/v1/tokens/:id — Get one token
app.get("/api/v1/tokens/:id", (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return errorResponse(res, 400, "INVALID_ID", "ID must be a positive integer");
  }

  const token = db.getTokenById(id);
  if (!token) {
    return errorResponse(res, 404, "NOT_FOUND", `Token with id ${id} not found`);
  }

  success(res, token);
});

// PUT /api/v1/tokens/:id — Update a token
app.put("/api/v1/tokens/:id", (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return errorResponse(res, 400, "INVALID_ID", "ID must be a positive integer");
  }

  const errors = validateUpdateToken(req.body);
  if (errors.length) {
    return errorResponse(res, 400, "VALIDATION_ERROR", "Validation failed", errors);
  }

  const body: UpdateTokenBody = {};
  if (req.body.name !== undefined) body.name = req.body.name.trim();
  if (req.body.symbol !== undefined) body.symbol = req.body.symbol.trim();
  if (req.body.price !== undefined) body.price = req.body.price;
  if (req.body.marketCap !== undefined) body.marketCap = req.body.marketCap;

  if (body.symbol && db.symbolExists(body.symbol, id)) {
    return errorResponse(res, 409, "CONFLICT", `Token with symbol "${body.symbol.toUpperCase()}" already exists`);
  }

  const token = db.updateToken(id, body);
  if (!token) {
    return errorResponse(res, 404, "NOT_FOUND", `Token with id ${id} not found`);
  }

  success(res, token);
});

// DELETE /api/v1/tokens/:id — Delete a token
app.delete("/api/v1/tokens/:id", (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return errorResponse(res, 400, "INVALID_ID", "ID must be a positive integer");
  }

  const deleted = db.deleteToken(id);
  if (!deleted) {
    return errorResponse(res, 404, "NOT_FOUND", `Token with id ${id} not found`);
  }

  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API base: http://localhost:${PORT}/api/v1/tokens`);
});
