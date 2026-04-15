import { sequelize, initDatabase } from "../src/database";

export async function setupTestDb() {
  process.env.NODE_ENV = "test";
  await initDatabase();
  // Clean tables in reverse dependency order
  await sequelize.query("DELETE FROM campaign_recipients");
  await sequelize.query("DELETE FROM campaigns");
  await sequelize.query("DELETE FROM recipients");
  await sequelize.query("DELETE FROM users");
}

export async function teardownTestDb() {
  await sequelize.close();
}
