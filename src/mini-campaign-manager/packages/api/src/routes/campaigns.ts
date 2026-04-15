import { Router, Request, Response, NextFunction } from "express";
import { Campaign, CampaignRecipient, Recipient } from "../models";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createCampaignSchema, updateCampaignSchema, scheduleCampaignSchema } from "../validators/campaigns";
import { AppError } from "../middleware/errorHandler";

const router = Router();

// Wrap async route handlers to forward errors to the error handler middleware
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

async function findOwnedCampaign(req: Request): Promise<Campaign> {
  const campaign = await Campaign.findOne({
    where: { id: req.params.id, createdBy: req.user!.id },
  });
  if (!campaign) throw new AppError(404, "NOT_FOUND", "Campaign not found");
  return campaign;
}

function requireDraft(campaign: Campaign) {
  if (campaign.status !== "draft") {
    throw new AppError(400, "INVALID_STATUS", "Only draft campaigns can be modified");
  }
}

function computeRates(counts: { total: number; sent: number; failed: number; opened: number }) {
  return {
    ...counts,
    open_rate: counts.sent > 0 ? +(counts.opened / counts.sent).toFixed(4) : 0,
    send_rate: counts.total > 0 ? +(counts.sent / counts.total).toFixed(4) : 0,
  };
}

async function syncRecipients(campaignId: number, recipientIds: number[]) {
  await CampaignRecipient.destroy({ where: { campaignId } });
  if (recipientIds.length) {
    await CampaignRecipient.bulkCreate(
      recipientIds.map((recipientId) => ({ campaignId, recipientId })),
      { ignoreDuplicates: true }
    );
  }
}

router.get("/", authenticate, asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = { createdBy: req.user!.id };
  if (req.query.status) where.status = req.query.status;

  const { rows, count } = await Campaign.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  res.json({
    data: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  });
}));

router.post("/", authenticate, validate(createCampaignSchema), asyncHandler(async (req, res) => {
  const { name, subject, body, recipientIds } = req.body;

  const campaign = await Campaign.create({ name, subject, body, createdBy: req.user!.id });

  if (recipientIds?.length) {
    await syncRecipients(campaign.id, recipientIds);
  }

  res.status(201).json({ data: campaign });
}));

router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const campaign = await Campaign.findOne({
    where: { id: req.params.id, createdBy: req.user!.id },
    include: [{
      model: CampaignRecipient,
      as: "campaignRecipients",
      include: [{ model: Recipient, attributes: ["id", "email", "name"] }],
    }],
  });
  if (!campaign) throw new AppError(404, "NOT_FOUND", "Campaign not found");

  const recipients = campaign.get("campaignRecipients") as CampaignRecipient[];
  const stats = recipients.reduce(
    (acc, r) => {
      acc.total++;
      if (r.status === "sent") acc.sent++;
      if (r.status === "failed") acc.failed++;
      if (r.openedAt !== null) acc.opened++;
      return acc;
    },
    { total: 0, sent: 0, failed: 0, opened: 0 }
  );

  res.json({
    data: {
      ...campaign.toJSON(),
      stats: computeRates(stats),
    },
  });
}));

// GET /campaigns/:id/stats — stats only (as required by spec)
router.get("/:id/stats", authenticate, asyncHandler(async (req, res) => {
  const campaign = await findOwnedCampaign(req);

  const recipients = await CampaignRecipient.findAll({ where: { campaignId: campaign.id } });
  const counts = recipients.reduce(
    (acc, r) => {
      acc.total++;
      if (r.status === "sent") acc.sent++;
      if (r.status === "failed") acc.failed++;
      if (r.openedAt !== null) acc.opened++;
      return acc;
    },
    { total: 0, sent: 0, failed: 0, opened: 0 }
  );

  res.json({ data: computeRates(counts) });
}));

router.patch("/:id", authenticate, validate(updateCampaignSchema), asyncHandler(async (req, res) => {
  const campaign = await findOwnedCampaign(req);
  requireDraft(campaign);

  const { name, subject, body, recipientIds } = req.body;
  if (name !== undefined) campaign.name = name;
  if (subject !== undefined) campaign.subject = subject;
  if (body !== undefined) campaign.body = body;
  await campaign.save();

  if (recipientIds !== undefined) {
    await syncRecipients(campaign.id, recipientIds);
  }

  res.json({ data: campaign });
}));

router.delete("/:id", authenticate, asyncHandler(async (req, res) => {
  const campaign = await findOwnedCampaign(req);
  requireDraft(campaign);
  await campaign.destroy();
  res.status(204).send();
}));

router.post("/:id/schedule", authenticate, validate(scheduleCampaignSchema), asyncHandler(async (req, res) => {
  const campaign = await findOwnedCampaign(req);
  requireDraft(campaign);

  campaign.status = "scheduled";
  campaign.scheduledAt = new Date(req.body.scheduledAt);
  await campaign.save();

  res.json({ data: campaign });
}));

router.post("/:id/send", authenticate, asyncHandler(async (req, res) => {
  const campaign = await findOwnedCampaign(req);

  if (campaign.status === "sent" || campaign.status === "sending") {
    throw new AppError(400, "INVALID_STATUS", `Campaign is already ${campaign.status}`);
  }

  campaign.status = "sending";
  await campaign.save();

  res.status(202).json({ data: { message: "Sending started", campaignId: campaign.id } });

  simulateSending(campaign.id).catch((err) => {
    console.error(`Send simulation failed for campaign ${campaign.id}:`, err);
  });
}));

async function simulateSending(campaignId: number) {
  const recipients = await CampaignRecipient.findAll({
    where: { campaignId, status: "pending" },
  });

  // Simulate per-recipient delay, then batch update
  const now = new Date();
  const updates: { recipientId: number; status: string; sentAt: Date | null; openedAt: Date | null }[] = [];

  for (const cr of recipients) {
    await new Promise((r) => setTimeout(r, 100 + Math.random() * 400));

    const succeeded = Math.random() < 0.8;
    const opened = succeeded && Math.random() < 0.3;
    updates.push({
      recipientId: cr.recipientId,
      status: succeeded ? "sent" : "failed",
      sentAt: succeeded ? now : null,
      openedAt: opened ? now : null,
    });
  }

  // Batch update all recipients at once
  await Promise.all(
    updates.map((u) =>
      CampaignRecipient.update(
        { status: u.status as "sent" | "failed", sentAt: u.sentAt, openedAt: u.openedAt },
        { where: { campaignId, recipientId: u.recipientId } }
      )
    )
  );

  await Campaign.update({ status: "sent" }, { where: { id: campaignId } });
}

export default router;
