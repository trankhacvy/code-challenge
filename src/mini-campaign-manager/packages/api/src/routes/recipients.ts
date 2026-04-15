import { Router, Request, Response, NextFunction } from "express";
import { Recipient } from "../models";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createRecipientSchema } from "../validators/recipients";
import { AppError } from "../middleware/errorHandler";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.get("/", authenticate, asyncHandler(async (_req, res) => {
  const recipients = await Recipient.findAll({ order: [["createdAt", "DESC"]] });
  res.json({ data: recipients });
}));

router.post("/", authenticate, validate(createRecipientSchema), asyncHandler(async (req, res) => {
  const { email, name } = req.body;

  const existing = await Recipient.findOne({ where: { email } });
  if (existing) throw new AppError(409, "CONFLICT", "Recipient email already exists");

  const recipient = await Recipient.create({ email, name: name || null });
  res.status(201).json({ data: recipient });
}));

export default router;
