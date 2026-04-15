import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../database";

interface UserAttributes {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
}

type UserCreationAttributes = Optional<UserAttributes, "id" | "createdAt">;

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number;
  declare email: string;
  declare name: string;
  declare passwordHash: string;
  declare readonly createdAt: Date;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "users", timestamps: false }
);

export default User;
