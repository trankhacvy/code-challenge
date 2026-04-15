import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../database";

interface CampaignAttributes {
  id: number;
  name: string;
  subject: string;
  body: string;
  status: "draft" | "sending" | "scheduled" | "sent";
  scheduledAt: Date | null;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

type CampaignCreationAttributes = Optional<CampaignAttributes, "id" | "status" | "scheduledAt" | "createdAt" | "updatedAt">;

class Campaign extends Model<CampaignAttributes, CampaignCreationAttributes> implements CampaignAttributes {
  declare id: number;
  declare name: string;
  declare subject: string;
  declare body: string;
  declare status: "draft" | "sending" | "scheduled" | "sent";
  declare scheduledAt: Date | null;
  declare createdBy: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Campaign.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    subject: { type: DataTypes.STRING(500), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM("draft", "sending", "scheduled", "sent"),
      allowNull: false,
      defaultValue: "draft",
    },
    scheduledAt: { type: DataTypes.DATE, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" } },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "campaigns", timestamps: true }
);

export default Campaign;
