import Joi from 'joi';
import { SYNC_FILTER_TYPES, SYNC_TRIGGER_SOURCE } from '../../constants/statuses.js';

export const triggerPullSchema = {
  body: Joi.object({
    deviceId: Joi.string().required().messages({
      'any.required': 'Target Device ID is required'
    }),
    filterType: Joi.string()
      .valid(...Object.values(SYNC_FILTER_TYPES))
      .default(SYNC_FILTER_TYPES.DELTA_UNSYNCED),
    dateFrom: Joi.date().iso().optional().allow(null),
    dateTo: Joi.date().iso().optional().allow(null),
    limit: Joi.number().integer().min(1).max(500).default(100)
  })
};

export const batchUploadSchema = {
  body: Joi.object({
    requestId: Joi.string().allow('', null).optional(),
    deviceId: Joi.string().required(),
    triggerSource: Joi.string()
      .valid(...Object.values(SYNC_TRIGGER_SOURCE))
      .default(SYNC_TRIGGER_SOURCE.ADMIN_PULL),
    messages: Joi.array()
      .items(
        Joi.object({
          sender: Joi.string().required(),
          // AES-256-GCM Armored components
          encryptedBody: Joi.string().required(),
          iv: Joi.string().required(),
          authTag: Joi.string().required(),
          messageDate: Joi.number().required().messages({
            'any.required': 'Message Unix timestamp is required'
          }),
          simSlot: Joi.string().valid('SIM 1', 'SIM 2', 'UNKNOWN').default('UNKNOWN'),
          carrierName: Joi.string().allow('', null).optional(),
          isRead: Joi.boolean().default(false)
        })
      )
      .required()
  })
};

export const listMessagesSchema = {
  query: Joi.object({
    deviceId: Joi.string().optional(),
    userId: Joi.string().optional(),
    sender: Joi.string().optional(),
    simSlot: Joi.string().valid('SIM 1', 'SIM 2', 'ALL').optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().optional(),
    search: Joi.string().allow('').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(500).default(20)
  })
};

export const batchDeleteSchema = {
  body: Joi.object({
    messageIds: Joi.array().items(Joi.string().required()).min(1).required()
  })
};
