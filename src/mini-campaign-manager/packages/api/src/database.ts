import { Sequelize } from "sequelize";
import fs from "fs/promises";
import path from "path";
import { config } from "./config";

export const sequelize = new Sequelize(config.databaseUrl, {
  dialect: "postgres",
  logging: false,
  define: {
    underscored: true,
  },
});

export async function runMigrations() {
  const migrationsDir = path.resolve(__dirname, "migrations");
  const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf-8");
    await sequelize.query(sql);
    console.log(`  Migration: ${file}`);
  }
}

export async function initDatabase() {
  await sequelize.authenticate();
  console.log("Database connected");
  await runMigrations();
  console.log("Migrations complete");
}
