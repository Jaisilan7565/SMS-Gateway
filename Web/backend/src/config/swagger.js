import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'SMS Transfer & Real-Time Sync API',
    version: '1.0.0',
    description:
      'Production-grade REST API with military-grade AES-256-GCM encryption, FCM silent background triggers, and Socket.io live synchronization.'
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/admin/login': {
      post: {
        tags: ['Auth'],
        summary: 'Admin login with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@smstransfer.com' },
                  password: { type: 'string', example: 'AdminSecurePassword#2026' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Authenticated successfully' } }
      }
    },
    '/auth/mobile/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register mobile user with email and password',
        responses: { 201: { description: 'Account created' } }
      }
    },
    '/auth/mobile/google': {
      post: {
        tags: ['Auth'],
        summary: 'One-click Google OAuth verification',
        responses: { 200: { description: 'Authenticated with Google' } }
      }
    },
    '/devices/register': {
      post: {
        tags: ['Devices'],
        summary: 'Register and pair Android device (called by Flutter on login)',
        responses: { 200: { description: 'Device registered and bound to user' } }
      }
    },
    '/devices': {
      get: {
        tags: ['Devices'],
        summary: 'List all connected mobile devices (Admin)',
        responses: { 200: { description: 'Devices list' } }
      }
    },
    '/sms/trigger-pull': {
      post: {
        tags: ['SMS'],
        summary: 'Trigger silent on-demand SMS pull from an Android device via FCM',
        responses: { 202: { description: 'Pull request dispatched' } }
      }
    },
    '/sms/batch-upload': {
      post: {
        tags: ['SMS'],
        summary: 'Upload AES-256-GCM encrypted SMS batch from Android',
        responses: { 200: { description: 'Batch stored and deduplicated' } }
      }
    },
    '/sms/messages': {
      get: {
        tags: ['SMS'],
        summary: 'Query decrypted SMS messages with filters (Admin)',
        responses: { 200: { description: 'Messages list' } }
      }
    },
    '/sms/messages/{id}': {
      delete: {
        tags: ['SMS'],
        summary: 'Delete single SMS message (Admin)',
        responses: { 200: { description: 'Message deleted' } }
      }
    },
    '/sms/messages/batch-delete': {
      post: {
        tags: ['SMS'],
        summary: 'Bulk delete SMS messages (Admin)',
        responses: { 200: { description: 'Messages deleted' } }
      }
    },
    '/audit-logs': {
      get: {
        tags: ['Audit'],
        summary: 'Query system security audit trail (Admin)',
        responses: { 200: { description: 'Audit trail' } }
      }
    }
  }
};

export const setupSwagger = (app) => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};

export default setupSwagger;
