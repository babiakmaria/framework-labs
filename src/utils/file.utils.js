import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const itemsPath = path.join(__dirname, "../../data/items");

export async function getAllFiles() {
  return await fs.readdir(itemsPath);
}

export async function readFile(id) {
  const filePath = path.join(itemsPath, `${id}.json`);
  const data = await fs.readFile(filePath, "utf-8");
  return JSON.parse(data);
}

export async function deleteFile(id) {
  const filePath = path.join(itemsPath, `${id}.json`);
  await fs.unlink(filePath);
}

export async function atomicWrite(filePath, data) {
  const tempPath = filePath.replace(".json", ".tmp.json");
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
  await fs.rename(tempPath, filePath);
}