import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ 
    coerceTypes: true,
    allErrors: true,
    useDefaults: true 
});

addFormats(ajv);

export default ajv;