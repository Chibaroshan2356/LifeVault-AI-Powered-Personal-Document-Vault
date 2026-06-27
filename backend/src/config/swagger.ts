/**
 * swagger.ts - OpenAPI / Swagger Configuration
 *
 * Serves interactive API documentation at /api-docs.
 * Raw OpenAPI JSON available at /api-docs.json (for Postman import).
 *
 * Access at: http://localhost:3000/api-docs
 */
import swaggerJSDoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LifeVault API',
      version: '1.0.0',
      description:
        'AI-Powered Personal Document Vault — REST API\n\n' +
        'All protected endpoints require a Bearer token in the Authorization header.',
    },
    servers: [
      { url: 'http://localhost:3000/api/v1', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste the accessToken from POST /auth/login',
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data:    { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field:   { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  /**
   * Use absolute paths to avoid glob resolution issues on Windows.
   * swagger-jsdoc reads JSDoc @swagger annotations from these files.
   */
  apis: [
    path.join(__dirname, '../modules/auth/auth.controller.ts'),
    path.join(__dirname, '../modules/auth/auth.routes.ts'),
    path.join(__dirname, '../modules/user/user.controller.ts'),
    path.join(__dirname, '../modules/user/user.routes.ts'),
    path.join(__dirname, '../modules/document/document.controller.ts'),
    path.join(__dirname, '../modules/document/document.routes.ts'),
  ],
};

let swaggerSpec: object;
try {
  swaggerSpec = swaggerJSDoc(options);
} catch (err) {
  // Swagger generation failure should not crash the server
  console.error('Warning: Swagger spec generation failed:', (err as Error).message);
  swaggerSpec = { openapi: '3.0.0', info: { title: 'LifeVault API', version: '1.0.0' }, paths: {} };
}

export { swaggerSpec };
