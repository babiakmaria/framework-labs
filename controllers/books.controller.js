import booksService from '#services/books.service';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { parse } from 'csv-parse/sync'; 
import { stringify } from 'csv-stringify/sync';
import path from 'path';
import fs from 'fs/promises';

class BooksController {
  async exportItems(request, reply) {
    const items = await booksService.getAll();
    const csv = stringify(items, { header: true });

    reply.header("Content-Disposition", 'attachment; filename="items.csv"');
    reply.type("text/csv");
    return csv;
  }

  async importItems(request, reply) {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ message: 'File is required' });
    }

    const fileName = data.filename;
    const content = await data.toBuffer();
    let items = [];

    try {
      if (fileName.endsWith('.json')) {
        items = JSON.parse(content.toString());
      } else if (fileName.endsWith('.csv')) {
        items = parse(content.toString(), {
          columns: true,
          skip_empty_lines: true,
          cast: true 
        });
      } else {
        return reply.status(400).send({ message: 'Unsupported file format' });
      }
    } catch (err) {
      return reply.status(400).send({ message: 'Error parsing file content' });
    }

    let imported = 0;
    let rejected = [];

    for (let i = 0; i < items.length; i++) {
    const item = items[i];
  
    const title = item.title?.toString().trim();
    const author = item.author?.toString().trim();
    const genre = item.genre?.toString().trim();
    const year = Number(item.year);
  
    if (!title || !author || !genre || !year) {
      rejected.push({
        row: i + 1,
        reason: 'Missing required fields'
      });
      continue;
    }
  
    if (year < 1000 || year > new Date().getFullYear()) {
      rejected.push({
        row: i + 1,
        reason: 'Invalid year'
      });
      continue;
    }
  
    try {
      await booksService.create({
        title,
        author,
        year,
        genre
      });
  
      imported++;
    } catch (error) {
      rejected.push({
        row: i + 1,
        reason: error.message || 'Validation failed'
      });
    }
  }
    return {
      imported,
      rejectedCount: rejected.length,
      rejected
    };
  }

  async uploadImage(request, reply) {
    const { id } = request.params;
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ message: 'Image is required' });
    }

    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(data.mimetype)) {
      return reply.status(400).send({ message: 'Only JPG or PNG allowed' });
    }

    const buffer = await data.toBuffer();

    if (buffer.length > 5 * 1024 * 1024) {
      return reply.status(400).send({ message: 'File too large (max 5MB)' });
    }

    const uploadDir = path.join(process.cwd(), 'uploads', id);
    await fs.mkdir(uploadDir, { recursive: true });

    const ext = path.extname(data.filename); 
    const fileName = `cover${ext}`;
    const filePath = path.join(uploadDir, fileName);

    await fs.writeFile(filePath, buffer);

    const relativePath = `/uploads/${id}/${fileName}`;
    await booksService.update(id, { image: relativePath });

    return {
      message: 'Image uploaded successfully',
      path: relativePath
    };
  }
  
  async getAll(request, reply) {
    const books = await booksService.getAll(request.query);
    reply.send(books);
  }

  async getById(request, reply) {
    const book = await booksService.getById(request.params.id);
    if (!book) return reply.notFound(ERROR_MESSAGES.BOOK_NOT_FOUND);
    reply.send(book);
  }

  async create(request, reply) {
    const book = await booksService.create(request.body);
    reply.status(201).send(book);
  }

  async update(request, reply) {
    const book = await booksService.update(request.params.id, request.body);
    if (!book) return reply.notFound(ERROR_MESSAGES.BOOK_NOT_FOUND);
    reply.send(book);
  }

  async patch(request, reply) {
    const book = await booksService.patch(request.params.id, request.body);
    if (!book) return reply.notFound(ERROR_MESSAGES.BOOK_NOT_FOUND);
    reply.send(book);
  }

  async delete(request, reply) {
    const success = await booksService.delete(request.params.id);
    if (!success) return reply.notFound(ERROR_MESSAGES.BOOK_NOT_FOUND);
    reply.send({ message: 'Deleted successfully' });
  }
}

export default new BooksController();