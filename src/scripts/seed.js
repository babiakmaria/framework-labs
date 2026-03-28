const path = require("path");
const fs = require("fs/promises");
const atomicWrite = require("../utils/atomicWrite");
const ItemModel = require("../models/item.model");
const { v4: uuidv4 } = require("uuid");

const data = [
  { title: "Harry Potter", author: "J.K. Rowling", genre: "Fantasy" },
  { title: "Demon Copperhead", author: "B. Kingsolver", genre: "Fiction" }
];

async function seed() {
  const folder = path.join(__dirname, "../../data/items");

  for (const item of data) {
    const id = uuidv4();

    const newItem = {
      ...ItemModel,
      ...item,
      id
    };

    const filePath = path.join(folder, `${id}.json`);
    await atomicWrite(filePath, newItem);
  }

  console.log("Seed finished!");
}

seed();