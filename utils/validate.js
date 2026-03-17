const ajv = require('#config/ajv');

function validate(schema, type = 'body') {
  const validateFn = ajv.compile(schema);

  return (request, reply, done) => {
    const data = request[type];

    const valid = validateFn(data);

    if (!valid) {
      reply.status(400).send({
        message: 'Validation error',
        errors: validateFn.errors,
      });
      return;
    }

    done();
  };
}

module.exports = validate;