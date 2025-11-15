#!/usr/bin/env tsx

/**
 * Script to generate and validate API documentation
 *
 * Usage:
 * npm run generate-docs              # Generate documentation
 * npm run generate-docs validate     # Validate OpenAPI spec
 * npm run generate-docs serve        # Start server with docs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const command = process.argv[2] || 'generate';

async function validateOpenAPISpec() {
  console.log('🔍 Validating OpenAPI specification...');

  try {
    const yamlContent = readFileSync(join(process.cwd(), 'openapi.yaml'), 'utf8');
    const yaml = await import('yamljs');
    const spec = yaml.parse(yamlContent);

    // Basic validation
    if (!spec.openapi) {
      throw new Error('Missing openapi version');
    }
    if (!spec.info) {
      throw new Error('Missing info section');
    }
    if (!spec.paths) {
      throw new Error('Missing paths section');
    }

    console.log('✅ OpenAPI specification is valid');
    console.log(`📊 Found ${Object.keys(spec.paths).length} API endpoints`);
    console.log(`📝 ${spec.info.title} v${spec.info.version}`);

    return true;
  } catch (error) {
    console.error('❌ OpenAPI validation failed:', error.message);
    return false;
  }
}

async function generateStats() {
  console.log('📈 Generating API statistics...');

  try {
    const yamlContent = readFileSync(join(process.cwd(), 'openapi.yaml'), 'utf8');
    const yaml = await import('yamljs');
    const spec = yaml.parse(yamlContent);

    const paths = spec.paths || {};
    const components = spec.components || {};
    const schemas = components.schemas || {};

    const endpoints = Object.keys(paths).length;
    const schemasCount = Object.keys(schemas).length;
    const getEndpoints = Object.values(paths).filter((path: any) => path.get).length;
    const postEndpoints = Object.values(paths).filter((path: any) => path.post).length;
    const putEndpoints = Object.values(paths).filter((path: any) => path.put).length;
    const deleteEndpoints = Object.values(paths).filter((path: any) => path.delete).length;

    console.log(`
📊 API Statistics:
  • Total Endpoints: ${endpoints}
  • GET Endpoints: ${getEndpoints}
  • POST Endpoints: ${postEndpoints}
  • PUT Endpoints: ${putEndpoints}
  • DELETE Endpoints: ${deleteEndpoints}
  • Total Schemas: ${schemasCount}

🏷️  Tags:
  ${spec.tags?.map((tag: any) => `  • ${tag.name}: ${tag.description}`).join('\n') || '  No tags defined'}
    `);

    return {
      endpoints,
      schemas: schemasCount,
      methods: { get: getEndpoints, post: postEndpoints, put: putEndpoints, delete: deleteEndpoints }
    };
  } catch (error) {
    console.error('❌ Failed to generate stats:', error.message);
    return null;
  }
}

function startDocsServer() {
  console.log('🚀 Starting server with API documentation...');

  try {
    console.log('📚 Starting development server...');
    console.log('📖 Swagger UI will be available at: http://localhost:3000/api-docs');
    console.log('📄 OpenAPI JSON: http://localhost:3000/api-docs.json');
    console.log('❤️  Health check: http://localhost:3000/health');

    execSync('npm run dev', { stdio: 'inherit', cwd: process.cwd() });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

function updateREADME() {
  console.log('📝 Updating API documentation README...');

  const content = `# SurveyLauncher API Documentation

## 📚 Interactive Documentation

### Swagger UI
- **URL**: http://localhost:3000/api-docs
- **Features**: Interactive testing, authentication support, schema exploration

### OpenAPI Specification
- **JSON**: http://localhost:3000/api-docs.json
- **YAML**: \`openapi.yaml\`

## 🚀 Quick Start

1. **Start Server**: \`npm run dev\`
2. **Open Docs**: Navigate to http://localhost:3000/api-docs
3. **Test API**: Use the interactive "Try it out" feature

## 📊 API Statistics

Generated on: ${new Date().toISOString()}

Use \`npm run generate-docs stats\` for detailed statistics.
`;

  try {
    writeFileSync(join(process.cwd(), 'docs/API_QUICKSTART.md'), content);
    console.log('✅ API quickstart documentation updated');
  } catch (error) {
    console.error('❌ Failed to update README:', error.message);
  }
}

// Main execution
switch (command) {
  case 'validate':
    const isValid = validateOpenAPISpec();
    process.exit(isValid ? 0 : 1);

  case 'stats':
    generateStats();
    break;

  case 'serve':
    if (validateOpenAPISpec()) {
      generateStats();
      startDocsServer();
    }
    break;

  case 'update-readme':
    updateREADME();
    break;

  case 'generate':
  default:
    console.log('📚 Generating SurveyLauncher API Documentation...\n');

    if (validateOpenAPISpec()) {
      generateStats();
      updateREADME();

      console.log('\n🎉 API Documentation Ready!');
      console.log('\n📖 Next Steps:');
      console.log('  1. Start server: npm run generate-docs serve');
      console.log('  2. Open browser: http://localhost:3000/api-docs');
      console.log('  3. Test endpoints using the interactive UI');
      console.log('\n📋 Available Commands:');
      console.log('  npm run generate-docs validate    # Validate OpenAPI spec');
      console.log('  npm run generate-docs stats       # Show API statistics');
      console.log('  npm run generate-docs serve       # Start server with docs');
      console.log('  npm run generate-docs update-readme # Update documentation');
    } else {
      console.error('\n❌ Documentation generation failed. Please fix the OpenAPI specification.');
      process.exit(1);
    }
    break;
}