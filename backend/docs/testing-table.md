# SurveyLauncher Backend Test Results

**Individual Test Scenario Results with Database Type and Status**
Last Updated: November 14, 2025

## Test Results Table

| Sr. | Test Name | Scenario | Live DB or Mock | Status |
|-----|-----------|----------|-----------------|--------|
| 1 | crypto.test.ts | should hash a password | Mock | ✅ PASS |
| 2 | crypto.test.ts | should verify a correct password | Mock | ✅ PASS |
| 3 | crypto.test.ts | should reject an incorrect password | Mock | ✅ PASS |
| 4 | crypto.test.ts | should generate different hashes for the same password | Mock | ✅ PASS |
| 5 | crypto.test.ts | should generate a unique JTI | Mock | ✅ PASS |
| 6 | crypto.test.ts | should return current UTC time | Mock | ✅ PASS |
| 7 | crypto.test.ts | should check clock skew correctly | Mock | ✅ PASS |
| 8 | crypto.test.ts | should calculate expiry timestamp correctly | Mock | ✅ PASS |
| 9 | crypto.test.ts | should create a valid JWS | Mock | ✅ PASS |
| 10 | crypto.test.ts | should verify a JWS signature | Mock | ✅ PASS |
| 11 | crypto.test.ts | should reject an invalid JWS | Mock | ✅ PASS |
| 12 | crypto.test.ts | should reject a tampered JWS | Mock | ✅ PASS |
| 13 | crypto.test.ts | should create and verify access token | Mock | ✅ PASS |
| 14 | crypto.test.ts | should create and verify refresh token | Mock | ✅ PASS |
| 15 | crypto.test.ts | should reject invalid access token | Mock | ✅ PASS |
| 16 | crypto.test.ts | should reject invalid refresh token | Mock | ✅ PASS |
| 17 | crypto.test.ts | should extract token from header correctly | Mock | ✅ PASS |
| 18 | crypto.test.ts | should generate secure random string | Mock | ✅ PASS |
| 19 | crypto.test.ts | should generate SHA-256 hash | Mock | ✅ PASS |
| 20 | jwt-service.test.ts | JWT-001: should create access token successfully | Mock | ✅ PASS |
| 21 | jwt-service.test.ts | JWT-002: should create refresh token successfully | Mock | ✅ PASS |
| 22 | jwt-service.test.ts | JWT-003: should create override token successfully | Mock | ✅ PASS |
| 23 | jwt-service.test.ts | JWT-004: should handle tokens without teamId | Mock | ✅ PASS |
| 24 | jwt-service.test.ts | JWT-005: should reject invalid token type | Mock | ✅ PASS |
| 25 | jwt-service.test.ts | JWT-006: should verify access token successfully | Mock | ✅ PASS |
| 26 | jwt-service.test.ts | JWT-007: should verify refresh token successfully | Mock | ✅ PASS |
| 27 | jwt-service.test.ts | JWT-008: should verify override token successfully | Mock | ✅ PASS |
| 28 | jwt-service.test.ts | JWT-009: should reject invalid token format | Mock | ✅ PASS |
| 29 | jwt-service.test.ts | JWT-010: should reject token with wrong type | Mock | ✅ PASS |
| 30 | jwt-service.test.ts | JWT-011: should revoke token successfully | Mock | ✅ PASS |
| 31 | jwt-service.test.ts | JWT-012: should handle revocation of non-existent token | Mock | ✅ PASS |
| 32 | jwt-service.test.ts | JWT-013: should check if token is revoked | Mock | ✅ PASS |
| 33 | jwt-service.test.ts | JWT-014: should handle malformed tokens gracefully | Mock | ✅ PASS |
| 34 | jwt-service.test.ts | JWT-015: should handle database errors in revocation check | Mock | ✅ PASS |
| 35 | jwt-service.test.ts | JWT-016: should extract JTI from valid token | Mock | ✅ PASS |
| 36 | jwt-service.test.ts | JWT-017: should handle refresh token validation | Mock | ✅ PASS |
| 37 | jwt-service.test.ts | JWT-018: should reject refresh token for non-existent session | Mock | ✅ PASS |
| 38 | jwt-service.test.ts | JWT-019: should reject malformed refresh token | Mock | ✅ PASS |
| 39 | jwt-service.test.ts | JWT-020: should handle refresh token creation error cases | Mock | ✅ PASS |
| 40 | auth-service.test.ts | should login successfully with valid credentials | Live DB | ❌ FAIL |
| 41 | auth-service.test.ts | should reject login with invalid credentials | Live DB | ✅ PASS |
| 42 | auth-service.test.ts | should reject login when device does not exist | Live DB | ✅ PASS |
| 43 | auth-service.test.ts | should reject login when user does not exist | Live DB | ✅ PASS |
| 44 | auth-service.test.ts | should reject login when user is inactive | Live DB | ✅ PASS |
| 45 | auth-service.test.ts | should reject login when device is inactive | Live DB | ✅ PASS |
| 46 | auth-service.test.ts | should reject login when user and device belong to different teams | Live DB | ✅ PASS |
| 47 | auth-service.test.ts | should reject login when user has no PIN set | Live DB | ✅ PASS |
| 48 | auth-service.test.ts | should reject login with invalid UUID format | Live DB | ✅ PASS |
| 49 | auth-service.test.ts | should reject login when rate limited | Live DB | ❌ FAIL |
| 50 | auth-service.test.ts | should reject login when user is locked out | Live DB | ❌ FAIL |
| 51 | auth-service.test.ts | should logout successfully with valid session | Live DB | ✅ PASS |
| 52 | auth-service.test.ts | should return error for nonexistent session | Live DB | ✅ PASS |
| 53 | auth-service.test.ts | should refresh token successfully | Live DB | ❌ FAIL |
| 54 | auth-service.test.ts | should handle invalid refresh token | Live DB | ✅ PASS |
| 55 | auth-service.test.ts | should return user information for valid token | Live DB | ✅ PASS |
| 56 | auth-service.test.ts | should reject missing token | Live DB | ✅ PASS |
| 57 | auth-service.test.ts | should reject invalid token format | Live DB | ✅ PASS |
| 58 | auth-service.test.ts | should reject invalid token | Live DB | ✅ PASS |
| 59 | auth-service.test.ts | should grant supervisor override with valid PIN | Live DB | ✅ PASS |
| 60 | auth-service.test.ts | should reject override for nonexistent device | Live DB | ✅ PASS |
| 61 | auth-service.test.ts | should reject override for invalid PIN | Live DB | ✅ PASS |
| 62 | auth-service.test.ts | should reject override when supervisor PIN is inactive | Live DB | ✅ PASS |
| 63 | auth-service.test.ts | should reject override when no supervisor PIN exists for team | Live DB | ✅ PASS |
| 64 | auth-service.test.ts | should reject override when rate limited | Live DB | ✅ PASS |
| 65-79 | policy-service.test.ts | 15 policy service tests (POLICY-001 through Recent Policy Issues) | Mock | ❌ ALL FAIL (Mock configuration issues) |
| 80 | telemetry-service.test.ts | TELEMETRY-001: should handle empty batch gracefully | Live DB | ✅ PASS |
| 81 | telemetry-service.test.ts | TELEMETRY-002: should reject batch from nonexistent device | Live DB | ✅ PASS |
| 82 | telemetry-service.test.ts | TELEMETRY-002: should reject batch from inactive device | Live DB | ✅ PASS |
| 83 | telemetry-service.test.ts | TELEMETRY-003: should handle batch size exceeding limits | Live DB | ✅ PASS |
| 84 | telemetry-service.test.ts | TELEMETRY-004: should reject invalid event types | Live DB | ✅ PASS |
| 85 | telemetry-service.test.ts | TELEMETRY-004: should accept valid event types | Live DB | ✅ PASS |
| 86 | telemetry-service.test.ts | TELEMETRY-005: should reject invalid timestamps | Live DB | ✅ PASS |
| 87 | telemetry-service.test.ts | TELEMETRY-006: should reject invalid GPS coordinates | Live DB | ✅ PASS |
| 88 | telemetry-service.test.ts | TELEMETRY-006: should reject GPS events missing coordinates | Live DB | ✅ PASS |
| 89 | telemetry-service.test.ts | TELEMETRY-007: should reject invalid battery levels | Live DB | ✅ PASS |
| 90 | telemetry-service.test.ts | TELEMETRY-008: should reject app usage events without app name | Live DB | ✅ PASS |
| 91 | telemetry-service.test.ts | TELEMETRY-009: should reject error events without error message | Live DB | ✅ PASS |
| 92 | telemetry-service.test.ts | TELEMETRY-010: should return telemetry statistics | Live DB | ✅ PASS |
| 93 | telemetry-service.test.ts | TELEMETRY-011: should return empty array for device with no events | Live DB | ✅ PASS |
| 94 | telemetry-service.test.ts | TELEMETRY-011: should return array for recent events query | Live DB | ✅ PASS |
| 95 | telemetry-service.test.ts | TELEMETRY-012: should check rate limiting for telemetry ingestion | Live DB | ✅ PASS |
| 96 | telemetry-service.test.ts | TELEMETRY-013: should update device last seen timestamp | Live DB | ✅ PASS |
| 97 | telemetry-service.test.ts | TELEMETRY-014: should handle mixed valid and invalid events | Live DB | ✅ PASS |
| 98 | telemetry-service.test.ts | TELEMETRY-015: should handle malformed GPS coordinates | Live DB | ✅ PASS |
| 99 | telemetry-service.test.ts | TELEMETRY-015: should handle events without required type | Live DB | ✅ PASS |

## Integration Tests - Individual Scenarios

| Sr. | Test Name | Scenario | Live DB or Mock | Status |
|-----|-----------|----------|-----------------|--------|
| 100 | api.test.ts | should login with valid credentials | Live DB | ✅ PASS |
| 101 | api.test.ts | should reject invalid credentials | Live DB | ✅ PASS |
| 102 | api.test.ts | should reject missing fields | Live DB | ✅ PASS |
| 103 | api.test.ts | should reject invalid device | Live DB | ✅ PASS |
| 104 | api.test.ts | should return user information with valid token | Live DB | ✅ PASS |
| 105 | api.test.ts | should reject requests without token | Live DB | ✅ PASS |
| 106 | api.test.ts | should reject requests with invalid token | Live DB | ✅ PASS |
| 107 | api.test.ts | should refresh access token with valid refresh token | Live DB | ✅ PASS |
| 108 | api.test.ts | should reject invalid refresh token | Live DB | ✅ PASS |
| 109 | api.test.ts | should reject missing refresh token | Live DB | ✅ PASS |
| 110 | api.test.ts | should return policy for valid device | Live DB | ✅ PASS |
| 111 | api.test.ts | should reject invalid device policy request | Live DB | ✅ PASS |
| 112 | api.test.ts | should accept valid telemetry batch | Live DB | ✅ PASS |
| 113 | api.test.ts | should reject invalid batch format | Live DB | ✅ PASS |
| 114 | api.test.ts | should reject invalid device telemetry | Live DB | ✅ PASS |
| 115 | api.test.ts | should accept empty telemetry batch | Live DB | ✅ PASS |
| 116 | auth.test.ts | should login with valid credentials | Live DB | ✅ PASS |
| 117 | auth.test.ts | should reject login with invalid PIN | Live DB | ❌ FAIL |
| 118 | auth.test.ts | should reject login for inactive user | Live DB | ❌ FAIL |
| 119 | auth.test.ts | should reject login for inactive device | Live DB | ❌ FAIL |
| 120 | auth.test.ts | should logout successfully | Live DB | ✅ PASS |
| 121 | auth.test.ts | should handle session not found on logout | Live DB | ❌ FAIL |
| 122 | auth.test.ts | should refresh token successfully | Live DB | ✅ PASS |
| 123 | auth.test.ts | should reject invalid refresh token | Live DB | ✅ PASS |
| 124 | auth.test.ts | should reject expired refresh token | Live DB | ❌ FAIL |
| 125 | auth.test.ts | should reject missing refresh token | Live DB | ✅ PASS |
| 126 | auth.test.ts | should get user info with valid token | Live DB | ✅ PASS |
| 127 | auth.test.ts | should reject user info without token | Live DB | ❌ FAIL |
| 128 | auth.test.ts | should reject user info with invalid token | Live DB | ❌ FAIL |
| 129 | auth-debug.test.ts | should test debug authentication flow | Live DB | ✅ PASS |
| 130 | security-rate-limiting.test.ts | should rate limit login attempts per device | Live DB | ❌ FAIL |
| 131 | security-rate-limiting.test.ts | should rate limit login attempts per IP address | Live DB | ✅ PASS |
| 132 | security-rate-limiting.test.ts | should allow legitimate login after rate limit window | Live DB | ✅ PASS |
| 133 | security-rate-limiting.test.ts | should apply separate rate limits for different devices | Live DB | ✅ PASS |
| 134 | security-rate-limiting.test.ts | should lock account after too many failed PIN attempts | Live DB | ❌ FAIL |
| 135 | security-rate-limiting.test.ts | should reset failed attempt counter after successful login | Live DB | ❌ FAIL |
| 136 | security-rate-limiting.test.ts | should allow login after lockout period expires | Live DB | ❌ FAIL |
| 137 | security-rate-limiting.test.ts | should reset counter only for the specific user | Live DB | ❌ FAIL |
| 138 | security-rate-limiting.test.ts | should apply separate rate limiting for supervisor PIN attempts | Live DB | ✅ PASS |
| 139 | security-rate-limiting.test.ts | should have independent rate limits for user vs supervisor attempts | Live DB | ✅ PASS |
| 140 | security-rate-limiting.test.ts | should reject malformed UUIDs in device ID | Live DB | ✅ PASS |
| 141 | security-rate-limiting.test.ts | should handle extremely long user codes | Live DB | ✅ PASS |
| 142 | security-rate-limiting.test.ts | should handle extremely long PINs | Live DB | ✅ PASS |
| 143 | security-rate-limiting.test.ts | should reject null/undefined values in required fields | Live DB | ✅ PASS |
| 144 | security-rate-limiting.test.ts | should handle concurrent login attempts safely | Live DB | ✅ PASS |
| 145 | supervisor-override.test.ts | should login with valid supervisor PIN | Live DB | ✅ PASS |
| 146 | supervisor-override.test.ts | should reject invalid supervisor PIN | Live DB | ✅ PASS |
| 147 | supervisor-override.test.ts | should reject supervisor login for nonexistent device | Live DB | ✅ PASS |
| 148 | supervisor-override.test.ts | should reject supervisor login for inactive device | Live DB | ✅ PASS |
| 149 | supervisor-override.test.ts | should reject supervisor login when no supervisor PIN exists | Live DB | ✅ PASS |
| 150 | supervisor-override.test.ts | should reject supervisor login when supervisor PIN is inactive | Live DB | ✅ PASS |
| 151 | supervisor-override.test.ts | should apply rate limiting for supervisor override attempts | Live DB | ✅ PASS |
| 152 | supervisor-override.test.ts | should have independent rate limits for user vs supervisor attempts | Live DB | ✅ PASS |
| 153 | supervisor-override.test.ts | should revoke active supervisor override | Live DB | ✅ PASS |
| 154 | supervisor-override.test.ts | should handle revoke of nonexistent override | Live DB | ✅ PASS |
| 155 | user-logout.test.ts | should logout successfully with valid session | Live DB | ✅ PASS |
| 156 | user-logout.test.ts | should handle logout for nonexistent session | Live DB | ✅ PASS |
| 157 | user-logout.test.ts | should handle logout with invalid token | Live DB | ❌ FAIL |
| 158 | user-logout.test.ts | should handle logout with missing token | Live DB | ❌ FAIL |
| 159 | user-logout.test.ts | should handle logout with malformed token | Live DB | ❌ FAIL |
| 160 | user-logout.test.ts | should handle logout with expired token | Live DB | ❌ FAIL |
| 161 | user-logout.test.ts | should handle logout with revoked token | Live DB | ❌ FAIL |
| 162 | user-logout.test.ts | should handle logout with token from wrong session | Live DB | ❌ FAIL |
| 163 | user-logout.test.ts | should handle logout with device mismatch | Live DB | ❌ FAIL |
| 164 | user-logout.test.ts | should handle logout with user mismatch | Live DB | ❌ FAIL |

## Empty Test Files (No Scenarios)
| Sr. | Test Name | Scenario | Live DB or Mock | Status |
|-----|-----------|----------|-----------------|--------|
| 165 | teams.test.ts | No tests implemented | Live DB | ❌ NO TESTS |
| 166 | users.test.ts | No tests implemented | Live DB | ❌ NO TESTS |
| 167 | devices.test.ts | No tests implemented | Live DB | ❌ NO TESTS |
| 168 | supervisor-pins.test.ts | No tests implemented | Live DB | ❌ NO TESTS |

## Final Summary
**Total Individual Test Scenarios: 168**
- **Unit Tests**: 99 scenarios (Sr. 1-99)
- **Integration Tests**: 65 scenarios (Sr. 100-164)
- **Empty Test Files**: 4 scenarios (Sr. 165-168)

**Overall Results:**
- **Total Tests**: 164 (actual test scenarios)
- **Passing**: 120 tests (73.2%)
- **Failing**: 44 tests (26.8%)
- **Individual Scenarios Documented**: 168 entries including empty test files