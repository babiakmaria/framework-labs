import fs from "fs/promises";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { createGzip } from "zlib";
import { Readable } from "stream";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

import ItemModel from "../models/item.model.js";
import { itemsPath } from "./file.utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupsPath = path.join(__dirname, "../../data/backups");
const versionFile = path.join(__dirname, "../data/version.json");

const MAX_BACKUPS = 5;

export async function createBackup() {
  await fs.mkdir(itemsPath, { recursive: true });
  await fs.mkdir(backupsPath, { recursive: true });

  const files = await fs.readdir(itemsPath);

  async function* generateContent() {
    yield "[";
    for (let i = 0; i < files.length; i++) {
      yield await fs.readFile(path.join(itemsPath, files[i]), "utf-8");
      if (i < files.length - 1) yield ",";
    }
    yield "]";
  }

  const backupFile = path.join(backupsPath, `${Date.now()}.gz`);

  await pipeline(
    Readable.from(generateContent()),
    createGzip(),
    createWriteStream(backupFile)
  );

  const backups = (await fs.readdir(backupsPath))
    .filter((f) => f.endsWith(".gz"))
    .sort();

  const toDelete = backups.slice(0, backups.length - MAX_BACKUPS);
  for (const backup of toDelete) {
    await fs.unlink(path.join(backupsPath, backup));
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
