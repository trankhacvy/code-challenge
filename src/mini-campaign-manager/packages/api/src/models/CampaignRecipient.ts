import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database";

interface CampaignRecipientAttributes {
  campaignId: number;
  recipientId: number;
  sentAt: Date | null;
  openedAt: Date | null;
  status: "pending" | "sent" | "failed";
}

class CampaignRecipient extends Model<CampaignRecipientAttributes> implements CampaignRecipientAttributes {
  declare campaignId: number;
  declare recipientId: number;
  declare sentAt: Date | null;
  declare openedAt: Date | null;
  declare status: "pending" | "sent" | "failed";
}

CampaignRecipient.init(
  {
    campaignId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: "campaigns", key: "id" },
      onDelete: "CASCADE",
    },
    recipientId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: "recipients", key: "id" },
      onDelete: "CASCADE",
    },
    sentAt: { type: DataTypes.DATE, allowNull: true },
    openedAt: { type: DataTypes.DATE, allowNull: true },
    status: {
      type: DataTypes.ENUM("pending", "sent", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  { sequelize, tableName: "campaign_recipients", timestamps: false }
);

export default CampaignRecipient;
