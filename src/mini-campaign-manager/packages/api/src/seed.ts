import bcrypt from "bcryptjs";
import { config } from "./config";
import { initDatabase } from "./database";
import { User, Campaign, Recipient, CampaignRecipient } from "./models";

async function seed() {
  await initDatabase();

  // Create demo user
  const passwordHash = await bcrypt.hash("password123", 10);
  const [user] = await User.findOrCreate({
    where: { email: "demo@example.com" },
    defaults: { name: "Demo User", passwordHash },
  });
  console.log(`User: demo@example.com / password123`);

  // Create recipients
  const recipientData = [
    { email: "alice@example.com", name: "Alice Johnson" },
    { email: "bob@example.com", name: "Bob Smith" },
    { email: "carol@example.com", name: "Carol Williams" },
    { email: "dave@example.com", name: "Dave Brown" },
    { email: "eve@example.com", name: "Eve Davis" },
  ];

  const recipients: Recipient[] = [];
  for (const r of recipientData) {
    const [recipient] = await Recipient.findOrCreate({ where: { email: r.email }, defaults: r });
    recipients.push(recipient);
  }
  console.log(`Created ${recipients.length} recipients`);

  // Create campaigns
  const draftCampaign = await Campaign.create({
    name: "Spring Sale",
    subject: "Don't miss our Spring Sale!",
    body: "Hi there! We're having a massive spring sale with up to 50% off everything.",
    createdBy: user.id,
  });

  const sentCampaign = await Campaign.create({
    name: "Welcome Email",
    subject: "Welcome to our platform!",
    body: "Welcome! We're excited to have you on board.",
    status: "sent",
    createdBy: user.id,
  });

  // Add recipients to campaigns
  for (const r of recipients) {
    await CampaignRecipient.findOrCreate({
      where: { campaignId: draftCampaign.id, recipientId: r.id },
      defaults: { campaignId: draftCampaign.id, recipientId: r.id },
    });

    // Sent campaign has completed recipients
    const sent = Math.random() < 0.8;
    await CampaignRecipient.findOrCreate({
      where: { campaignId: sentCampaign.id, recipientId: r.id },
      defaults: {
        campaignId: sentCampaign.id,
        recipientId: r.id,
        status: sent ? "sent" : "failed",
        sentAt: sent ? new Date() : null,
        openedAt: sent && Math.random() < 0.4 ? new Date() : null,
      },
    });
  }

  console.log("Created 2 campaigns with recipients");
  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
