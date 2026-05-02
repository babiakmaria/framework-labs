import fp from 'fastify-plugin';
import mysql from 'mysql2/promise';

async function mysqlPlugin(fastify) {
  const pool = mysql.createPool({
    host: fastify.config.MYSQL_HOST,
    port: fastify.config.MYSQL_PORT,
    user: fastify.config.MYSQL_USER,
    password: fastify.config.MYSQL_PASSWORD,
    database: fastify.config.MYSQL_DB,
    waitForConnections: true,
    connectionLimit: 10
  });

  try {
    const conn = await pool.getConnection();
    conn.release();
  } catch (err) {
    fastify.log.error('MySQL connection failed: ' + err.message);
    process.exit(1);
  }

  fastify.decorate('db', pool);

  fastify.addHook('onClose', async () => {
    await pool.end();
  });
}

export default fp(mysqlPlugin);
