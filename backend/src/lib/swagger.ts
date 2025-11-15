import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'yamljs';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SurveyLauncher API',
      version: '1.0.0',
      description: 'Comprehensive REST API for SurveyLauncher mobile device management platform',
      contact: {
        name: 'SurveyLauncher Team',
        email: 'support@surveylauncher.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.surveylauncher.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token for mobile app authentication',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
          description: 'HTTP-only cookie for web admin authentication',
        },
      },
    },
  },
  apis: [
    './src/server.ts', // Health endpoint
    './src/routes/api.ts', // Mobile API routes
    './src/routes/web-admin-api.ts', // Web Admin API routes
    './src/routes/api/web-admin/auth.ts', // Web Admin auth routes (Hono version)
  ],
};

// Read the OpenAPI spec from the YAML file
export function loadOpenAPISpec() {
  try {
    const yamlContent = readFileSync(join(process.cwd(), 'openapi.yaml'), 'utf8');
    return yaml.parse(yamlContent);
  } catch (error) {
    console.error('Error loading OpenAPI spec:', error);
    // Fallback to JSDoc-generated spec
    return swaggerJsdoc(options);
  }
}

export const swaggerSpec = loadOpenAPISpec();

export const swaggerUiOptions = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { margin: 20px 0 }
  `,
  customSiteTitle: 'SurveyLauncher API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
  },
};