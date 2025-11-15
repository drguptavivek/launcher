# SurveyLauncher API Postman Collection

## Overview

This Postman collection contains all the API endpoints for the SurveyLauncher Mobile Device Management System. It's organized into logical folders for easy navigation and testing.

## Files

- **SurveyLauncher-API-Collection.postman_collection.json** - Main Postman collection
- **SurveyLauncher-API-Environment.postman_environment.json** - Environment variables
- **POSTMAN_COLLECTION_README.md** - This documentation file

## Setup Instructions

### 1. Import Collection

1. Open Postman
2. Click "Import" in the top left
3. Select "SurveyLauncher-API-Collection.postman_collection.json"
4. Click "Import"

### 2. Import Environment

1. In Postman, click the environment dropdown (top right)
2. Click "Import"
3. Select "SurveyLauncher-API-Environment.postman_environment.json"
4. Select the imported environment from the dropdown

### 3. Configure Base URL

The collection uses `{{baseUrl}}` variable. Update it if your server runs on a different URL:
- Default: `http://localhost:3000`
- Production: Update to your production API URL

## Authentication

The collection supports two types of authentication:

### Mobile Device Authentication
1. Use **"Device User Login"** request to get an access token
2. The token is automatically stored in `{{accessToken}}` variable
3. Subsequent requests will use this token

### Web Admin Authentication
1. Use **"Web Admin Login"** request to get admin token
2. Token stored in `{{webAdminToken}}` variable
3. Used for admin-specific endpoints

## Collection Structure

### 🏥 Health & Documentation
- **Health Check** - Server health status
- **OpenAPI JSON** - Raw API specification
- **Swagger UI** - Interactive API documentation

### 🔐 Web Admin Authentication
- **Web Admin Login** - Authenticate as admin
- **Web Admin Whoami** - Get current admin user info
- **Web Admin Logout** - End admin session

### 📱 Mobile Authentication
- **Device User Login** - Daily device user login
- **Whoami** - Get current user/session info
- **Heartbeat** - Send device heartbeat
- **Logout** - End user session
- **Refresh Token** - Refresh access token

### 👥 Team Management
- **List Teams** - Get paginated team list
- **Create Team** - Create new team
- **Get Team by ID** - Retrieve specific team
- **Update Team** - Update team details
- **Delete Team** - Soft delete team

### 👤 User Management
- **List Users** - Get paginated user list with filters
- **Create User** - Create new user with PIN
- **Get User by ID** - Retrieve specific user
- **Update User** - Update user details
- **Delete User** - Soft delete user

### 📱 Device Management
- **List Devices** - Get paginated device list with filters
- **Register Device** - Register new device
- **Get Device by ID** - Retrieve specific device
- **Update Device** - Update device details
- **Delete Device** - Soft delete device

### 📋 Policy & Telemetry
- **Get Policy for Device** - Retrieve JWS-signed policy
- **Submit Telemetry** - Submit batch telemetry data

### 🔓 Supervisor Override
- **Supervisor Override Login** - Emergency access with supervisor PIN

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API base URL | `http://localhost:3000` |
| `accessToken` | Mobile user JWT token | Auto-populated |
| `webAdminToken` | Web admin JWT token | Auto-populated |
| `supervisorToken` | Supervisor override token | Auto-populated |
| `deviceId` | Device UUID for testing | `550e8400-e29b-41d4-a716-446655440001` |
| `teamId` | Team UUID for testing | `550e8400-e29b-41d4-a716-446655440002` |
| `userId` | User UUID for testing | `550e8400-e29b-41d4-a716-446655440003` |
| `sessionId` | Current session ID | Auto-populated |
| `supervisorPin` | Supervisor PIN for testing | `123456` |

## Testing Workflow

### 1. Basic Authentication Test
1. Run **"Health Check"** - Verify server is running
2. Run **"Device User Login"** - Test user authentication
3. Run **"Whoami"** - Verify token works
4. Run **"Logout"** - Clean up session

### 2. Full CRUD Workflow
1. Login as admin or user with permissions
2. Create a team → Create users → Register devices
3. Test policy retrieval
4. Submit telemetry data
5. Test supervisor override
6. Clean up created resources

### 3. Telemetry Testing
1. Login as device user
2. Submit heartbeat telemetry
3. Submit GPS telemetry
4. Verify telemetry processing

## Response Codes

- **200** - Success
- **201** - Created
- **400** - Bad Request (validation error)
- **401** - Unauthorized (authentication required)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **500** - Internal Server Error

## Test Scripts

Each request includes automated test scripts that:

- Verify response codes are within expected ranges
- Check response structure and required fields
- Store tokens and IDs in environment variables
- Clean up variables on logout
- Test for proper authentication requirements

## Common Issues

### 401 Unauthorized
- Check that you've logged in and have a valid token
- Verify token hasn't expired
- Ensure correct token type (mobile vs web admin)

### 404 Not Found
- Verify resource IDs exist in database
- Check that resource belongs to your team/organization
- Ensure proper permissions

### Validation Errors
- Check request body structure
- Verify required fields are present
- Ensure field values are within constraints

## Debugging Tips

1. **Check Console** - Postman console shows detailed request/response info
2. **Use Tests Tab** - View test results and variable values
3. **Inspect Headers** - Verify authentication headers are sent
4. **Check Response Body** - Look for error messages and details

## Security Notes

- Never share collections with stored tokens
- Use environment variables for sensitive data
- Regularly rotate test credentials
- Don't use production credentials for testing

## Support

For issues with the API:
1. Check server logs for detailed error messages
2. Verify database connection and data
3. Ensure proper configuration
4. Review API documentation at `/api-docs`

For issues with the Postman collection:
1. Verify environment variables are set correctly
2. Check for syntax errors in requests
3. Ensure proper import of collection and environment
4. Review test script errors in console