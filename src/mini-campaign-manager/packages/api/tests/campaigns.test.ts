import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { setupTestDb, teardownTestDb } from "./setup";

let token: string;
let campaignId: number;

beforeAll(async () => {
  await setupTestDb();

  // Register and get token
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ email: "campaign-test@example.com", name: "Test", password: "password123" });
  token = res.body.data.token;
});

afterAll(() => teardownTestDb());

describe("Campaign business rules", () => {
  it("creates a draft campaign", async () => {
    const res = await request(app)
      .post("/api/v1/campaigns")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Test Campaign", subject: "Hello", body: "World" });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("draft");
    campaignId = res.body.data.id;
  });

  it("allows editing a draft campaign", async () => {
    const res = await request(app)
      .patch(`/api/v1/campaigns/${campaignId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subject: "Updated Subject" });

    expect(res.status).toBe(200);
    expect(res.body.data.subject).toBe("Updated Subject");
  });

  it("rejects editing a sent campaign", async () => {
    // Force status to 'sent' directly
    const { Campaign } = await import("../src/models");
    await Campaign.update({ status: "sent" }, { where: { id: campaignId } });

    const res = await request(app)
      .patch(`/api/v1/campaigns/${campaignId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subject: "Should Fail" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_STATUS");
  });

  it("rejects deleting a sent campaign", async () => {
    const res = await request(app)
      .delete(`/api/v1/campaigns/${campaignId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_STATUS");
  });

  it("rejects scheduling with a past date", async () => {
    // Create a new draft campaign
    const createRes = await request(app)
      .post("/api/v1/campaigns")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Schedule Test", subject: "Test", body: "Body" });

    const res = await request(app)
      .post(`/api/v1/campaigns/${createRes.body.data.id}/schedule`)
      .set("Authorization", `Bearer ${token}`)
      .send({ scheduledAt: "2020-01-01T00:00:00Z" });

    expect(res.status).toBe(400);
  });
});
