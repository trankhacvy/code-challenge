import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models";
import { config } from "../config";
import { validate } from "../middleware/validate";
import { registerSchema, loginSchema } from "../validators/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

function signToken(user: { id: number; email: string }) {
  return jwt.sign({ id: user.id, email: user.email }, config.jwtSecret, { expiresIn: "7d" });
}

router.post("/register", validate(registerSchema), asyncHandler(async (req, res) => {
  const { email, name, password } = req.body;

  const existing = await User.findOne({ where: { email } });
  if (existing) throw new AppError(409, "CONFLICT", "Email already registered");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, name, passwordHash });

  res.status(201).json({
    data: { token: signToken(user), user: { id: user.id, email: user.email, name: user.name } },
  });
}));

router.post("/login", validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  res.json({
    data: { token: signToken(user), user: { id: user.id, email: user.email, name: user.name } },
  });
}));

export default router;
