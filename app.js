import fastify from 'fastify';
import { config } from '#config/env';
import booksRoutes from '#routes/books.routes';

const app = fastify({ 
  logger: true 
});

app.register(booksRoutes);

const start = async () => {
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    console.log(`Server running at http://${config.HOST}:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();