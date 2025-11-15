#!/usr/bin/env tsx

/**
 * Simple script to generate API statistics
 */

import { readFileSync } from 'fs';
import { join } from 'path';

try {
  const yamlContent = readFileSync(join(process.cwd(), 'openapi.yaml'), 'utf8');

  // Count endpoints manually
  const pathMatches = yamlContent.match(/^\s*\/[^:]+:$/gm) || [];
  const getMatches = yamlContent.match(/get:/gm) || [];
  const postMatches = yamlContent.match(/post:/gm) || [];
  const putMatches = yamlContent.match(/put:/gm) || [];
  const deleteMatches = yamlContent.match(/delete:/gm) || [];

  const schemaMatches = yamlContent.match(/^\s+[A-Z][a-zA-Z]+:/gm) || [];

  console.log(`
📊 SurveyLauncher API Statistics:
  • Total Paths: ${pathMatches.length}
  • GET Endpoints: ${getMatches.length}
  • POST Endpoints: ${postMatches.length}
  • PUT Endpoints: ${putMatches.length}
  • DELETE Endpoints: ${deleteMatches.length}
  • Total Schemas: ${schemaMatches.length}

🚀 Interactive Documentation:
  • Swagger UI: http://localhost:3000/api-docs
  • OpenAPI JSON: http://localhost:3000/api-docs.json

✅ OpenAPI specification loaded successfully!
  `);

} catch (error) {
  console.error('❌ Error reading OpenAPI specification:', error.message);
  process.exit(1);
}