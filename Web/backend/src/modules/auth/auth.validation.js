import Joi from 'joi';

export const adminLoginSchema = {
  body: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  })
};

export const mobileRegisterSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters long'
    }),
    fullName: Joi.string().allow('', null).optional()
  })
};

export const mobileLoginSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  })
};

export const googleOAuthSchema = {
  body: Joi.object({
    idToken: Joi.string().allow('', null).optional(),
    email: Joi.string().email().optional(),
    displayName: Joi.string().allow('', null).optional(),
    photoUrl: Joi.string().allow('', null).optional(),
    googleId: Joi.string().allow('', null).optional()
  }).or('idToken', 'email')
};
