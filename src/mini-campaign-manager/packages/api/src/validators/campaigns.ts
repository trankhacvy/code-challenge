import { z } from "zod";

export const createCampaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  subject: z.string().min(1, "Subject is required").max(500),
  body: z.string().min(1, "Body is required"),
  recipientIds: z.array(z.number().int().positive()).optional(),
});

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).optional(),
  recipientIds: z.array(z.number().int().positive()).optional(),
});

export const scheduleCampaignSchema = z.object({
  scheduledAt: z.string().refine(
    (val) => new Date(val) > new Date(),
    { message: "scheduled_at must be a future timestamp" }
  ),
});
