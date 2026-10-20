import Joi from 'joi';

export const registerDeviceSchema = {
  body: Joi.object({
    androidId: Joi.string().required().messages({
      'any.required': 'Android ID is required'
    }),
    deviceName: Joi.string().default('Android Device'),
    manufacturer: Joi.string().allow('', null).optional(),
    model: Joi.string().allow('', null).optional(),
    osVersion: Joi.string().allow('', null).optional(),
    fcmToken: Joi.string().required().messages({
      'any.required': 'FCM Token is required for silent on-demand push wakeups'
    }),
    simSlots: Joi.object({
      sim1: Joi.object({
        carrier: Joi.string().default('Not detected'),
        slotIndex: Joi.number().default(0),
        subId: Joi.number().optional()
      }).optional(),
      sim2: Joi.object({
        carrier: Joi.string().default('Not detected'),
        slotIndex: Joi.number().default(1),
        subId: Joi.number().optional()
      }).optional()
    }).optional(),
    batteryLevel: Joi.number().min(0).max(100).optional(),
    isCharging: Joi.boolean().optional()
  })
};

export const updateHeartbeatSchema = {
  body: Joi.object({
    batteryLevel: Joi.number().min(0).max(100).optional(),
    isCharging: Joi.boolean().optional(),
    fcmToken: Joi.string().optional()
  })
};
