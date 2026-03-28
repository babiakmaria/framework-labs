import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

import ItemModel from "../models/item.model.js";
import { atomicWrite, itemsPath } from "../utils/file.utils.js";
import { BOOKS } from "../../data/books.data.js";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const versionFile = path.join(__dirname, "../data/version.json");

  const modelHash = crypto
    .createHash("md5")
    .update(JSON.stringify(ItemModel))
    .digest("hex");

  let oldHash = null;
  try {
    const version = JSON.parse(await fs.readFile(versionFile, "utf-8"));
    oldHash = version.hash;
  } catch {}

  if (oldHash === modelHash) {
    console.log("Migration not needed");
    const existingFiles = await fs.readdir(itemsPath).catch(() => []);
    if (existingFiles.length > 0) return; 
    console.log("Items folder is empty, proceeding with initial seed...");
  }

  await fs.mkdir(itemsPath, { recursive: true });

  const files = await fs.readdir(itemsPath);

  if (files.length === 0) {
    console.log("No files found. Seeding from books.data.js...");
    for (const book of BOOKS) {
      const id = uuidv4();
      const newBook = { ...ItemModel, ...book, id };
      await atomicWrite(path.join(itemsPath, `${id}.json`), newBook);
    }
  } else {
    for (const file of files) {
      const filePath = path.join(itemsPath, file);
      const item = JSON.parse(await fs.readFile(filePath, "utf-8"));
      const updated = { ...ItemModel, ...item };
      await atomicWrite(filePath, updated);
    }
  }
  const versionDir = path.dirname(versionFile);
  await fs.mkdir(versionDir, { recursive: true });

  await fs.writeFile(versionFile, JSON.stringify({ hash: modelHash }, null, 2));
  console.log("Migration/Seeding completed!");
}

migrate().catch(console.error);