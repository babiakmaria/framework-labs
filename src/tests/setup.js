import { vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-32ch';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32chars!!';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test_db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.PORT = '3000';
process.env.HOST = '0.0.0.0';
process.env.GENRES_API_PORT = '3001';
process.env.ADMIN_API_KEY = 'test-admin-key';
