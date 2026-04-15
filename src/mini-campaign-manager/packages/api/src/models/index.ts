import User from "./User";
import Campaign from "./Campaign";
import Recipient from "./Recipient";
import CampaignRecipient from "./CampaignRecipient";

// Associations
User.hasMany(Campaign, { foreignKey: "createdBy", as: "campaigns" });
Campaign.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

Campaign.belongsToMany(Recipient, {
  through: CampaignRecipient,
  foreignKey: "campaignId",
  otherKey: "recipientId",
  as: "recipients",
});

Recipient.belongsToMany(Campaign, {
  through: CampaignRecipient,
  foreignKey: "recipientId",
  otherKey: "campaignId",
  as: "campaigns",
});

Campaign.hasMany(CampaignRecipient, { foreignKey: "campaignId", as: "campaignRecipients" });
CampaignRecipient.belongsTo(Campaign, { foreignKey: "campaignId" });
CampaignRecipient.belongsTo(Recipient, { foreignKey: "recipientId" });

export { User, Campaign, Recipient, CampaignRecipient };
