const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { configSchema } = require('#validators/config.schema');

const ajv = new Ajv({ useDefaults: true, coerceTypes: true });
addFormats(ajv);

const validate = ajv.compile(configSchema);

const rawConfig = {
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || '127.0.0.1',
  NODE_ENV: process.env.NODE_ENV || 'development'
};

const valid = validate(rawConfig);

if (!valid) {
  console.error('Invalid configuration:', ajv.errorsText(validate.errors));
  process.exit(1);
}

export const config = rawConfig;