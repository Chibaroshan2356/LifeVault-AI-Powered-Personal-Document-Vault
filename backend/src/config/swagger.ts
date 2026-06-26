/**
 * swagger.ts - OpenAPI / Swagger Configuration
 *
 * Sets up swagger-jsdoc to auto-generate the OpenAPI spec from JSDoc
 * annotations in route files, and swagger-ui-express to serve the
 * interactive docs at /api-docs.
 *
 * Accessible at: http://localhost:3000/api-docs
 *
 * Why Swagger?
 *  - Self-documenting API — no separate doc maintenance
 *  - Interactive testing during development and viva
 *  - Auto-generates OpenAPI 3.0 spec that can be imported into Postman
 */
import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LifeVault API',
      version: '1.0.0',
      description:
        'AI-Powered Personal Document Vault — REST API documentation.\n\n' +
        'All protected endpoints require a Bearer token in the Authorization header.',
      contact: {
        name: 'LifeVault',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        /**
         * BearerAuth: JWT token security scheme.
         * Applied globally so protected endpoints show a lock icon in Swagger UI.
         */
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter the JWT access token received from POST /auth/login',
        },
      },
      /**
       * Reusable response schemas referenced across multiple endpoints.
       */
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object' },
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
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page:       { type: 'integer', example: 1 },
            limit:      { type: 'integer', example: 10 },
            total:      { type: 'integer', example: 42 },
            totalPages: { type: 'integer', example: 5 },
          },
        },
      },
    },
    /**
     * Apply BearerAuth globally — endpoints that don't need auth
     * can override with security: [] in their JSDoc.
     */
    security: [{ BearerAuth: [] }],
  },
  /**
   * Glob patterns pointing to files containing @swagger JSDoc annotations.
   * Add new route files here as modules are implemented.
   */
  apis: [
    './src/modules/**/*.routes.ts',
    './src/modules/**/*.controller.ts',
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
