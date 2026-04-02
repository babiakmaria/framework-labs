import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

import ItemModel from "../models/item.model.js";
import { itemsPath } from "./file.utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupsPath = path.join(__dirname, "../../data/backups");
const versionFile = path.join(__dirname, "../data/version.json");

export async function createBackup() {
  await fs.mkdir(itemsPath, { recursive: true });
  await fs.mkdir(backupsPath, { recursive: true });

  const timestamp = Date.now();
  const backupFolder = path.join(backupsPath, `${timestamp}`);

  await fs.mkdir(backupFolder, { recursive: true });

  const files = await fs.readdir(itemsPath);

  for (const file of files) {
    await fs.copyFile(
      path.join(itemsPath, file),
      path.join(backupFolder, file)
    );
  }

  const backups = await fs.readdir(backupsPath);
  if (backups.length > 5) {
    backups.sort();
    await fs.rm(path.join(backupsPath, backups[0]), { recursive: true });
  }
}

export async function checkSchemaVersion(logger) {
  const currentHash = crypto
    .createHash("md5")
    .update(JSON.stringify(ItemModel))
    .digest("hex");

  let savedHash = null;

  try {
    const version = JSON.parse(await fs.readFile(versionFile, "utf-8"));
    savedHash = version.hash;
  } catch {}

  if (savedHash !== currentHash) {
    logger.warn(
      'Data schema changed. Run "npm run migrate" to update existing files.'
    );
  }
}
