import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing or invalid token" } });
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as { id: number; email: string };
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
  }
}
