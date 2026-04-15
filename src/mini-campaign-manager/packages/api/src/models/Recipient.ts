import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../database";

interface RecipientAttributes {
  id: number;
  email: string;
  name: string | null;
  createdAt: Date;
}

type RecipientCreationAttributes = Optional<RecipientAttributes, "id" | "name" | "createdAt">;

class Recipient extends Model<RecipientAttributes, RecipientCreationAttributes> implements RecipientAttributes {
  declare id: number;
  declare email: string;
  declare name: string | null;
  declare readonly createdAt: Date;
}

Recipient.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "recipients", timestamps: false }
);

export default Recipient;
