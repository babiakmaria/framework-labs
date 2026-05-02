import fp from 'fastify-plugin';
import mongoose from 'mongoose';

export default fp(async (fastify) => {
  try {
    await mongoose.connect(fastify.config.MONGO_URL, { dbName: fastify.config.MONGO_DB_NAME });
    fastify.log.info('MongoDB connected');
  } catch (err) {
    fastify.log.error('MongoDB connection error:', err);
    process.exit(1);
  }

  fastify.decorate('db', mongoose.connection);

  fastify.addHook('onClose', async () => {
    await mongoose.connection.close();
    fastify.log.info('MongoDB connection closed');
  });
});
