import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { setupTestDb, teardownTestDb } from "./setup";
import { Recipient, CampaignRecipient, Campaign } from "../src/models";

let token: string;

beforeAll(async () => {
  await setupTestDb();

  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ email: "send-test@example.com", name: "Test", password: "password123" });
  token = res.body.data.token;
});

afterAll(() => teardownTestDb());

describe("Send simulation", () => {
  it("sends a campaign and marks all recipients as sent or failed", async () => {
    // Create recipients
    const r1 = await Recipient.create({ email: "r1@test.com", name: "R1" });
    const r2 = await Recipient.create({ email: "r2@test.com", name: "R2" });
    const r3 = await Recipient.create({ email: "r3@test.com", name: "R3" });

    // Create campaign with recipients
    const createRes = await request(app)
      .post("/api/v1/campaigns")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Send Test",
        subject: "Test",
        body: "Body",
        recipientIds: [r1.id, r2.id, r3.id],
      });

    const campaignId = createRes.body.data.id;

    // Send the campaign
    const sendRes = await request(app)
      .post(`/api/v1/campaigns/${campaignId}/send`)
      .set("Authorization", `Bearer ${token}`);

    expect(sendRes.status).toBe(202);

    // Wait for async sending to complete (max 5s)
    let campaign: Campaign | null = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      campaign = await Campaign.findByPk(campaignId);
      if (campaign?.status === "sent") break;
    }

    expect(campaign?.status).toBe("sent");

    // All recipients should be sent or failed (none pending)
    const recipients = await CampaignRecipient.findAll({ where: { campaignId } });
    expect(recipients.length).toBe(3);
    for (const r of recipients) {
      expect(["sent", "failed"]).toContain(r.status);
    }
  }, 15000);
});
