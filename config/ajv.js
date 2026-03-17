const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ 
    coerceTypes: true,
    allErrors: true,
    useDefaults: true });
addFormats(ajv);

module.exports = ajv;