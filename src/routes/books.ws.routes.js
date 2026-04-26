import booksService from '../services/books.service.js';
import { booksEmitter } from '../events/books.emitter.js';

export default async function (fastify) {
  fastify.get('/ws', { websocket: true }, async (socket) => {
    const books = await booksService.getAll();
    socket.send(JSON.stringify({ event: 'init', data: books }));

    const send = (payload) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(payload));
      }
    };

    const onCreated = (book) => send({ event: 'created', data: book });
    const onUpdated = (book) => send({ event: 'updated', data: book });
    const onDeleted = (id) => send({ event: 'deleted', id });

    booksEmitter.on('books:created', onCreated);
    booksEmitter.on('books:updated', onUpdated);
    booksEmitter.on('books:deleted', onDeleted);

    socket.on('close', () => {
      booksEmitter.off('books:created', onCreated);
      booksEmitter.off('books:updated', onUpdated);
      booksEmitter.off('books:deleted', onDeleted);
    });
  });
}
