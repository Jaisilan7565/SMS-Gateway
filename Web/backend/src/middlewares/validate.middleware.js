import ApiError from '../utils/apiError.js';

/**
 * Higher-order middleware to validate incoming request data against a Joi schema
 * @param {object} schema - Joi validation schema { body, query, params }
 */
export const validate = (schema) => (req, res, next) => {
  const validationOptions = {
    abortEarly: false, // Include all errors, not just the first one
    allowUnknown: true, // Ignore unknown props not in schema
    stripUnknown: true // Remove unknown props from validated output
  };

  const toValidate = {};
  if (schema.body) toValidate.body = req.body;
  if (schema.query) toValidate.query = req.query;
  if (schema.params) toValidate.params = req.params;

  const errors = [];

  for (const key of Object.keys(toValidate)) {
    if (schema[key]) {
      const { error, value } = schema[key].validate(toValidate[key], validationOptions);
      if (error) {
        errors.push(...error.details.map((detail) => detail.message));
      } else {
        req[key] = value;
      }
    }
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation error', errors));
  }

  return next();
};

export default validate;
