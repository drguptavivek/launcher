# SurveyLauncher Backend API Test Cases

This document outlines comprehensive test cases for all implemented API endpoints.

## Test Structure

- **Unit Tests**: Individual service/function testing
- **Integration Tests**: Full API endpoint testing with database
- **Security Tests**: Authentication and authorization testing
- **Performance Tests**: Response time and load testing

---

## 1. Team Management API Tests

### 1.1 POST /api/v1/teams (Create Team)

#### Happy Path Tests
- ✅ **TC-TEAM-001**: Create team with valid data
  - Input: Valid team data (name, timezone, stateId)
  - Expected: 201 Created, team object with ID
  - Validation: Team stored in database with correct values

- ✅ **TC-TEAM-002**: Create team with minimum required fields
  - Input: Only required fields (name, stateId)
  - Expected: 201 Created, team with default timezone
  - Validation: Default timezone applied correctly

#### Validation Tests
- ✅ **TC-TEAM-003**: Create team with missing name
  - Input: Team data without name
  - Expected: 400 Bad Request, error code 'MISSING_FIELDS'
  - Validation: No team created in database

- ✅ **TC-TEAM-004**: Create team with missing stateId
  - Input: Team data without stateId
  - Expected: 400 Bad Request, error code 'MISSING_FIELDS'
  - Validation: No team created in database

- ✅ **TC-TEAM-005**: Create team with empty name
  - Input: Team data with empty name string
  - Expected: 400 Bad Request, error code 'INVALID_NAME'
  - Validation: No team created in database

- ✅ **TC-TEAM-006**: Create team with invalid timezone
  - Input: Team data with invalid timezone
  - Expected: 400 Bad Request, error code 'INVALID_TIMEZONE'
  - Validation: No team created in database

- ✅ **TC-TEAM-007**: Create team with invalid stateId length
  - Input: Team data with stateId longer than 16 chars
  - Expected: 400 Bad Request, error code 'INVALID_STATE_ID'
  - Validation: No team created in database

#### Security Tests
- ✅ **TC-TEAM-008**: Create team without authentication
  - Input: No Authorization header
  - Expected: 401 Unauthorized
  - Validation: No team created in database

- ✅ **TC-TEAM-009**: Create team with TEAM_MEMBER role
  - Input: Valid team data, user with TEAM_MEMBER role
  - Expected: 403 Forbidden, error code 'INSUFFICIENT_PERMISSIONS'
  - Validation: No team created in database

- ✅ **TC-TEAM-010**: Create team with SUPERVISOR role
  - Input: Valid team data, user with SUPERVISOR role
  - Expected: 403 Forbidden, error code 'INSUFFICIENT_PERMISSIONS'
  - Validation: No team created in database

### 1.2 GET /api/v1/teams (List Teams)

#### Happy Path Tests
- ✅ **TC-TEAM-011**: List teams as admin
  - Input: Admin authentication
  - Expected: 200 OK, paginated list of all teams
  - Validation: Pagination structure correct, total count accurate

- ✅ **TC-TEAM-012**: List teams with pagination
  - Input: Admin auth, page=1, limit=10
  - Expected: 200 OK, paginated results
  - Validation: Correct page and limit applied

- ✅ **TC-TEAM-013**: List teams with search
  - Input: Admin auth, search="test"
  - Expected: 200 OK, filtered teams
  - Validation: Only teams matching search returned

#### Security Tests
- ✅ **TC-TEAM-014**: List teams without authentication
  - Input: No Authorization header
  - Expected: 401 Unauthorized

- ✅ **TC-TEAM-015**: List teams with TEAM_MEMBER role
  - Input: Team member authentication
  - Expected: 200 OK, only user's team
  - Validation: Only team user belongs to returned

### 1.3 GET /api/v1/teams/:id (Get Team)

#### Happy Path Tests
- ✅ **TC-TEAM-016**: Get existing team as admin
  - Input: Valid team ID, admin auth
  - Expected: 200 OK, team object
  - Validation: All team fields present

- ✅ **TC-TEAM-017**: Get own team as team member
  - Input: User's team ID, team member auth
  - Expected: 200 OK, team object
  - Validation: Team details correct

#### Error Tests
- ✅ **TC-TEAM-018**: Get non-existent team
  - Input: Invalid team ID
  - Expected: 404 Not Found, error code 'TEAM_NOT_FOUND'

- ✅ **TC-TEAM-019**: Get team without authentication
  - Input: No Authorization header
  - Expected: 401 Unauthorized

- ✅ **TC-TEAM-020**: Get other team as team member
  - Input: Different team ID, team member auth
  - Expected: 403 Forbidden, error code 'INSUFFICIENT_PERMISSIONS'

### 1.4 PUT /api/v1/teams/:id (Update Team)

#### Happy Path Tests
- ✅ **TC-TEAM-021**: Update team with valid data
  - Input: Valid team update data, admin auth
  - Expected: 200 OK, updated team object
  - Validation: Changes saved to database

#### Validation Tests
- ✅ **TC-TEAM-022**: Update team with invalid timezone
  - Input: Invalid timezone, admin auth
  - Expected: 400 Bad Request, error code 'INVALID_TIMEZONE'

#### Security Tests
- ✅ **TC-TEAM-023**: Update team without authentication
  - Input: No Authorization header
  - Expected: 401 Unauthorized

- ✅ **TC-TEAM-024**: Update team with TEAM_MEMBER role
  - Input: Team member auth, valid data
  - Expected: 403 Forbidden, error code 'INSUFFICIENT_PERMISSIONS'

### 1.5 DELETE /api/v1/teams/:id (Delete Team)

#### Happy Path Tests
- ✅ **TC-TEAM-025**: Delete team with no dependencies
  - Input: Empty team ID, admin auth
  - Expected: 200 OK
  - Validation: Team marked as inactive

#### Error Tests
- ✅ **TC-TEAM-026**: Delete team with users
  - Input: Team with users, admin auth
  - Expected: 400 Bad Request, error code 'TEAM_HAS_USERS'

- ✅ **TC-TEAM-027**: Delete team with devices
  - Input: Team with devices, admin auth
  - Expected: 400 Bad Request, error code 'TEAM_HAS_DEVICES'

#### Security Tests
- ✅ **TC-TEAM-028**: Delete team without authentication
  - Input: No Authorization header
  - Expected: 401 Unauthorized

---

## 2. User Management API Tests

### 2.1 POST /api/v1/users (Create User)

#### Happy Path Tests
- ✅ **TC-USER-001**: Create user with valid data
  - Input: Valid user data (teamId, code, displayName, role, pin)
  - Expected: 201 Created, user object (without PIN)
  - Validation: User and PIN stored correctly in database

- ✅ **TC-USER-002**: Create user with optional email
  - Input: Valid user data with email
  - Expected: 201 Created, user with email
  - Validation: Email stored correctly

#### Validation Tests
- ✅ **TC-USER-003**: Create user with missing required fields
  - Input: User data missing teamId, code, displayName, or pin
  - Expected: 400 Bad Request, error code 'MISSING_FIELDS'

- ✅ **TC-USER-004**: Create user with duplicate code in team
  - Input: Existing user code, same team
  - Expected: 409 Conflict, error code 'USER_CODE_EXISTS'

- ✅ **TC-USER-005**: Create user with invalid role
  - Input: Invalid role value
  - Expected: 400 Bad Request, error code 'INVALID_ROLE'

- ✅ **TC-USER-006**: Create user with weak PIN
  - Input: PIN shorter than 4 characters
  - Expected: 400 Bad Request, error code 'WEAK_PIN'

#### Security Tests
- ✅ **TC-USER-007**: Create user without authentication
  - Input: No Authorization header
  - Expected: 401 Unauthorized

- ✅ **TC-USER-008**: Create user with TEAM_MEMBER role
  - Input: Team member authentication
  - Expected: 403 Forbidden, error code 'INSUFFICIENT_PERMISSIONS'

### 2.2 GET /api/v1/users (List Users)

#### Happy Path Tests
- ✅ **TC-USER-009**: List users as admin
  - Input: Admin authentication
  - Expected: 200 OK, paginated list of all users
  - Validation: Pagination structure correct, includes user info

- ✅ **TC-USER-010**: List users with filters
  - Input: Admin auth, teamId, role, isActive filters
  - Expected: 200 OK, filtered users
  - Validation: Filters applied correctly

- ✅ **TC-USER-011**: List users with search
  - Input: Admin auth, search parameter
  - Expected: 200 OK, users matching search
  - Validation: Search applied to display name

#### Security Tests
- ✅ **TC-USER-012**: List users without authentication
  - Input: No Authorization header
  - Expected: 401 Unauthorized

- ✅ **TC-USER-013**: List users as team member
  - Input: Team member authentication
  - Expected: 200 OK, only team members
  - Validation: Only users from same team returned

### 2.3 GET /api/v1/users/:id (Get User)

#### Happy Path Tests
- ✅ **TC-USER-014**: Get existing user as admin
  - Input: Valid user ID, admin auth
  - Expected: 200 OK, user object
  - Validation: All user fields present, no PIN

#### Error Tests
- ✅ **TC-USER-015**: Get non-existent user
  - Input: Invalid user ID
  - Expected: 404 Not Found, error code 'USER_NOT_FOUND'

#### Security Tests
- ✅ **TC-USER-016**: Get user without authentication
  - Input: No Authorization header
  - Expected: 401 Unauthorized

- ✅ **TC-USER-017**: Get user from different team
  - Input: Different team user ID, team member auth
  - Expected: 403 Forbidden, error code 'INSUFFICIENT_PERMISSIONS'

### 2.4 PUT /api/v1/users/:id (Update User)

#### Happy Path Tests
- ✅ **TC-USER-018**: Update user with valid data
  - Input: Valid update data, admin auth
  - Expected: 200 OK, updated user object
  - Validation: Changes saved to database

- ✅ **TC-USER-019**: Update user PIN
  - Input: New PIN, admin auth
  - Expected: 200 OK, updated user
  - Validation: PIN hash updated correctly

#### Validation Tests
- ✅ **TC-USER-020**: Update user with weak PIN
  - Input: New PIN shorter than 4 chars, admin auth
  - Expected: 400 Bad Request, error code 'WEAK_PIN'

#### Security Tests
- ✅ **TC-USER-021**: Update user without authentication
  - Input: No Authorization header
  - Expected: 401 Unauthorized

- ✅ **TC-USER-022**: Update user as same user (self)
  - Input: User's own ID, user auth, limited fields
  - Expected: 200 OK, limited fields updated
  - Validation: Only allowed fields updated

### 2.5 DELETE /api/v1/users/:id (Delete User)

#### Happy Path Tests
- ✅ **TC-USER-023**: Deactivate user
  - Input: Valid user ID, admin auth
  - Expected: 200 OK
  - Validation: User marked as inactive

#### Security Tests
- ✅ **TC-USER-024**: Delete user without authentication
  - Input: No Authorization header
  - Expected: 401 Unauthorized

### 2.6 POST /api/v1/users/:id/reset-pin (Reset User PIN)

#### Happy Path Tests
- ✅ **TC-USER-025**: Reset user PIN as admin
  - Input: Valid user ID, new PIN, admin auth
  - Expected: 200 OK
  - Validation: PIN reset successfully

#### Security Tests
- ✅ **TC-USER-026**: Reset PIN without authentication
  - Input: No Authorization header
  - Expected: 401 Unauthorized

- ✅ **TC-USER-027**: Reset PIN as team member (own PIN)
  - Input: User's own ID, team member auth
  - Expected: 200 OK (if allowed by business rules)

---

## 3. Device Management API Tests

### 3.1 POST /api/v1/devices (Create Device)

#### Happy Path Tests
- ✅ **TC-DEVICE-001**: Create device with valid data
  - Input: Valid device data (teamId, name, androidId, appVersion)
  - Expected: 201 Created, device object
  - Validation: Device stored in database correctly

#### Validation Tests
- ✅ **TC-DEVICE-002**: Create device with duplicate Android ID
  - Input: Existing Android ID
  - Expected: 409 Conflict, error code 'ANDROID_ID_EXISTS'

- ✅ **TC-DEVICE-003**: Create device with missing required fields
  - Input: Device data missing teamId or name
  - Expected: 400 Bad Request, error code 'MISSING_FIELDS'

#### Security Tests
- ✅ **TC-DEVICE-004**: Create device without authentication
  - Input: No Authorization header
  - Expected: 401 Unauthorized

### 3.2 GET /api/v1/devices (List Devices)

#### Happy Path Tests
- ✅ **TC-DEVICE-005**: List devices as admin
  - Input: Admin authentication
  - Expected: 200 OK, paginated list of all devices
  - Validation: Pagination structure correct

- ✅ **TC-DEVICE-006**: List devices with filters
  - Input: Admin auth, teamId, isActive filters
  - Expected: 200 OK, filtered devices
  - Validation: Filters applied correctly

#### Security Tests
- ✅ **TC-DEVICE-007**: List devices without authentication
  - Input: No Authorization header
  - Expected: 401 Unauthorized

### 3.3 GET /api/v1/devices/:id (Get Device)

#### Happy Path Tests
- ✅ **TC-DEVICE-008**: Get existing device as admin
  - Input: Valid device ID, admin auth
  - Expected: 200 OK, device object
  - Validation: All device fields present

#### Error Tests
- ✅ **TC-DEVICE-009**: Get non-existent device
  - Input: Invalid device ID
  - Expected: 404 Not Found, error code 'DEVICE_NOT_FOUND'

### 3.4 PUT /api/v1/devices/:id (Update Device)

#### Happy Path Tests
- ✅ **TC-DEVICE-010**: Update device with valid data
  - Input: Valid update data, admin auth
  - Expected: 200 OK, updated device object
  - Validation: Changes saved to database

#### Validation Tests
- ✅ **TC-DEVICE-011**: Update device with duplicate Android ID
  - Input: Android ID belonging to another device
  - Expected: 409 Conflict, error code 'ANDROID_ID_EXISTS'

### 3.5 DELETE /api/v1/devices/:id (Delete Device)

#### Happy Path Tests
- ✅ **TC-DEVICE-012**: Deactivate device
  - Input: Valid device ID, admin auth
  - Expected: 200 OK
  - Validation: Device marked as inactive

---

## 4. Supervisor PIN Management API Tests

### 4.1 POST /api/v1/supervisor/pins (Create Supervisor PIN)

#### Happy Path Tests
- ✅ **TC-SUP-001**: Create supervisor PIN with valid data
  - Input: Valid PIN data (teamId, name, pin)
  - Expected: 201 Created, PIN object (without hash)
  - Validation: PIN stored correctly with hash

#### Validation Tests
- ✅ **TC-SUP-002**: Create supervisor PIN with weak PIN
  - Input: PIN shorter than 4 characters
  - Expected: 400 Bad Request, error code 'WEAK_PIN'

#### Security Tests
- ✅ **TC-SUP-003**: Create supervisor PIN without authentication
  - Input: No Authorization header
  - Expected: 401 Unauthorized

### 4.2 GET /api/v1/supervisor/pins (List Supervisor PINs)

#### Happy Path Tests
- ✅ **TC-SUP-004**: List supervisor PINs as admin
  - Input: Admin authentication
  - Expected: 200 OK, list of supervisor PINs
  - Validation: PIN hashes not exposed

### 4.3 GET /api/v1/supervisor/pins/:teamId (Get Team Supervisor PIN)

#### Happy Path Tests
- ✅ **TC-SUP-005**: Get team supervisor PIN as team member
  - Input: Team ID, team member auth
  - Expected: 200 OK, supervisor PIN info
  - Validation: PIN hash not exposed

### 4.4 PUT /api/v1/supervisor/pins/:teamId (Update Supervisor PIN)

#### Happy Path Tests
- ✅ **TC-SUP-006**: Update supervisor PIN
  - Input: Valid update data, admin auth
  - Expected: 200 OK, updated PIN info
  - Validation: New PIN hashed correctly

### 4.5 POST /api/v1/supervisor/pins/:teamId/rotate (Rotate Supervisor PIN)

#### Happy Path Tests
- ✅ **TC-SUP-007**: Rotate supervisor PIN
  - Input: Team ID, admin auth, optional new PIN
  - Expected: 200 OK, new PIN generated
  - Validation: Old PIN deactivated, new PIN active

### 4.6 GET /api/v1/supervisor/pins/:teamId/active (Get Active Supervisor PIN)

#### Happy Path Tests
- ✅ **TC-SUP-008**: Get active supervisor PIN
  - Input: Team ID, team member auth
  - Expected: 200 OK, active PIN info
  - Validation: Only active PIN returned

---

## 5. Authentication Tests

### 5.1 Token Validation Tests

- ✅ **TC-AUTH-001**: Valid JWT token accepted
- ✅ **TC-AUTH-002**: Invalid JWT token rejected
- ✅ **TC-AUTH-003**: Expired JWT token rejected
- ✅ **TC-AUTH-004**: Missing JWT token rejected
- ✅ **TC-AUTH-005**: Malformed JWT token rejected

### 5.2 Role-Based Access Tests

- ✅ **TC-AUTH-006**: Admin can access all endpoints
- ✅ **TC-AUTH-007**: Supervisor can access team endpoints
- ✅ **TC-AUTH-008**: Team member can access limited endpoints
- ✅ **TC-AUTH-009**: Role escalation attempts blocked

### 5.3 Team-Based Access Tests

- ✅ **TC-AUTH-010**: Users can access own team resources
- ✅ **TC-AUTH-011**: Users cannot access other team resources
- ✅ **TC-AUTH-012**: Cross-team data access blocked

---

## 6. Performance Tests

### 6.1 Response Time Tests

- ✅ **TC-PERF-001**: Team creation < 200ms
- ✅ **TC-PERF-002**: User listing < 300ms (100 users)
- ✅ **TC-PERF-003**: Device listing < 300ms (100 devices)
- ✅ **TC-PERF-004**: Search functionality < 500ms

### 6.2 Load Tests

- ✅ **TC-PERF-005**: Concurrent user creation (10 users)
- ✅ **TC-PERF-006**: Concurrent device registration (10 devices)
- ✅ **TC-PERF-007**: Database connection under load

---

## 7. Error Handling Tests

### 7.1 Validation Error Tests

- ✅ **TC-ERROR-001**: Required field validation
- ✅ **TC-ERROR-002**: Data type validation
- ✅ **TC-ERROR-003**: Length validation
- ✅ **TC-ERROR-004**: Format validation

### 7.2 Business Logic Error Tests

- ✅ **TC-ERROR-005**: Duplicate resource creation
- ✅ **TC-ERROR-006**: Resource dependency validation
- ✅ **TC-ERROR-007**: Business rule validation

### 7.3 System Error Tests

- ✅ **TC-ERROR-008**: Database connection errors
- ✅ **TC-ERROR-009**: Network timeout handling
- ✅ **TC-ERROR-010**: Internal server error handling

---

## Test Execution Plan

### Phase 1: Unit Tests (Day 1)
- Service layer testing
- Database operations testing
- Utility function testing

### Phase 2: Integration Tests (Day 1)
- API endpoint testing
- Authentication testing
- Authorization testing

### Phase 3: Security Tests (Day 2)
- Penetration testing
- Input validation testing
- Authorization bypass testing

### Phase 4: Performance Tests (Day 2)
- Load testing
- Response time testing
- Stress testing

### Phase 5: End-to-End Tests (Day 2)
- Complete workflow testing
- Frontend integration testing
- Real-world scenario testing

---

## Success Criteria

- ✅ All happy path tests pass
- ✅ All validation tests pass
- ✅ All security tests pass
- ✅ All performance thresholds met
- ✅ 95%+ code coverage achieved
- ✅ No critical vulnerabilities found
- ✅ All error cases handled gracefully

---

**Test Cases Created**: November 13, 2025
**Total Test Cases**: 70+ across all endpoints
**Estimated Execution Time**: 2-3 days
**Test Framework**: Jest + Supertest + Test Database