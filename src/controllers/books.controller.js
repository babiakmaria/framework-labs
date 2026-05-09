import Ajv from 'ajv';
import booksRepository from '../repositories/books.repository.js';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { getFullImageUrl } from '../utils/getFullUrl.js';
import { createBookSchema } from '../schemas/books.schemas.js';
import { parse } from 'csv-parse/sync';
import { stringify as stringifyStream } from 'csv-stringify';
import { BookAgeTransform } from '../transforms/books.transform.js';
import { NdjsonTransform } from '../transforms/ndjson.transform.js';
import { pipeline } from 'stream/promises';
import { booksEmitter } from '../events/books.emitter.js';
import path from 'path';
import fs from 'fs/promises';

const ajv = new Ajv();
const validateBook = ajv.compile(createBookSchema.schema.body);

class BooksController {
  constructor(booksService, fetchGenre) {
    this.booksService = booksService;
    this.fetchGenre = fetchGenre;

    this.exportItems = this.exportItems.bind(this);
    this.streamItems = this.streamItems.bind(this);
    this.importItems = this.importItems.bind(this);
    this.uploadImage = this.uploadImage.bind(this);
    this.getAllPaginated = this.getAllPaginated.bind(this);
    this.getDetails = this.getDetails.bind(this);
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.patch = this.patch.bind(this);
    this.delete = this.delete.bind(this);
  }

  async exportItems(request, reply) {
    const shouldTransform = request.query.transform === 'true';

    reply.raw.writeHead(200, {
      'Content-Disposition': 'attachment; filename="items.csv"',
      'Content-Type': 'text/csv',
    });

    const csvStream = stringifyStream({ header: true });
    const booksStream = booksRepository.createStream();

    if (shouldTransform) {
      await pipeline(booksStream, new BookAgeTransform(), csvStream, reply.raw);
    } else {
      await pipeline(booksStream, csvStream, reply.raw);
    }
  }

  async streamItems(_request, reply) {
    const booksStream = booksRepository.createStream();
    const ndjsonTransform = new NdjsonTransform();

    booksStream.on('error', (err) => ndjsonTransform.destroy(err));
    booksStream.pipe(ndjsonTransform);

    reply.type('application/x-ndjson');
    return reply.send(ndjsonTransform);
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
          cast: true,
        });
      } else {
        return reply.status(400).send({ message: 'Unsupported file format' });
      }
    } catch {
      return reply.status(400).send({ message: 'Error parsing file content' });
    }

    let imported = 0;
    const rejected = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      const normalized = {
        title: item.title?.toString().trim(),
        author: item.author?.toString().trim(),
        genre: item.genre?.toString().trim(),
        year: Number(item.year),
      };

      if (!validateBook(normalized)) {
        rejected.push({
          row: i + 1,
          reason: ajv.errorsText(validateBook.errors),
        });
        continue;
      }

      try {
        await this.booksService.create(normalized);
        imported++;
      } catch (error) {
        rejected.push({
          row: i + 1,
          reason: error.message || 'Validation failed',
        });
      }
    }
    return {
      imported,
      rejectedCount: rejected.length,
      rejected,
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
    await this.booksService.update(id, { image: relativePath });

    return {
      message: 'Image uploaded successfully',
      path: relativePath,
    };
  }

  async getAllPaginated(request, reply) {
    const result = await this.booksService.getAllPaginated(request.query);
    result.data = result.data.map((b) => ({
      ...b,
      image: getFullImageUrl(request, b.image),
    }));
    reply.send(result);
  }

  async getDetails(request, reply) {
    const book = await this.booksService.getById(request.params.id);
    if (!book) return reply.notFound(ERROR_MESSAGES.BOOK_NOT_FOUND);

    const genre = await this.fetchGenre(book.genreId);

    return reply.send({
      ...book,
      image: getFullImageUrl(request, book.image),
      genre: genre ?? null,
    });
  }

  async getAll(request, reply) {
    const books = await this.booksService.getAll(request.query);
    reply.send(
      books.map((b) => ({ ...b, image: getFullImageUrl(request, b.image) }))
    );
  }

  async getById(request, reply) {
    const book = await this.booksService.getById(request.params.id);
    if (!book) return reply.notFound(ERROR_MESSAGES.BOOK_NOT_FOUND);
    reply.send({ ...book, image: getFullImageUrl(request, book.image) });
  }

  async create(request, reply) {
    const book = await this.booksService.create(request.body);
    booksEmitter.emit('books:created', book);
    reply.status(201).send({ ...book, image: getFullImageUrl(request, book.image) });
  }

  async update(request, reply) {
    const book = await this.booksService.update(request.params.id, request.body);
    if (!book) return reply.notFound(ERROR_MESSAGES.BOOK_NOT_FOUND);
    booksEmitter.emit('books:updated', book);
    reply.send({ ...book, image: getFullImageUrl(request, book.image) });
  }

  async patch(request, reply) {
    const book = await this.booksService.patch(request.params.id, request.body);
    if (!book) return reply.notFound(ERROR_MESSAGES.BOOK_NOT_FOUND);
    booksEmitter.emit('books:updated', book);
    reply.send({ ...book, image: getFullImageUrl(request, book.image) });
  }

  async delete(request, reply) {
    const success = await this.booksService.delete(request.params.id);
    if (!success) return reply.notFound(ERROR_MESSAGES.BOOK_NOT_FOUND);
    booksEmitter.emit('books:deleted', request.params.id);
    reply.code(204).send();
  }
}

export function createBooksController(booksService, fetchGenre) {
  return new BooksController(booksService, fetchGenre);
}
