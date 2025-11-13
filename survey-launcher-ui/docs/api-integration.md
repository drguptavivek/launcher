# SurveyLauncher API Integration Documentation

## Overview

This document provides comprehensive documentation for the SurveyLauncher Admin Frontend API integration layer, which connects the SvelteKit 5 frontend to the SurveyLauncher backend API.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Endpoints](#api-endpoints)
3. [Authentication System](#authentication-system)
4. [Error Handling](#error-handling)
5. [Usage Examples](#usage-examples)
6. [Type Definitions](#type-definitions)
7. [Testing Guide](#testing-guide)

---

## Architecture Overview

### **Technology Stack**
- **Frontend**: SvelteKit 5 with Svelte 5 runes
- **API Communication**: Remote functions + Direct fetch calls
- **Validation**: Valibot schema validation
- **State Management**: Svelte 5 reactive state
- **Type Safety**: TypeScript with comprehensive type definitions

### **File Structure**
```
src/lib/api/
├── client.ts                 # API client configuration and utilities
├── remote/
│   ├── types.ts              # TypeScript definitions
│   ├── auth.remote.ts        # Authentication endpoints
│   ├── supervisor.remote.ts  # Supervisor override
│   ├── policy.remote.ts      # Policy management
│   ├── telemetry.remote.ts   # Telemetry handling
│   └── index.ts              # Main exports
└── index.ts                  # API entry point

src/lib/stores/
└── auth.ts                   # Authentication state management
```

---

## API Endpoints

### **Authentication Endpoints (5 endpoints)**

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/v1/auth/login` | User authentication | ✅ Implemented |
| GET | `/api/v1/auth/whoami` | Get current user info | ✅ Implemented |
| POST | `/api/v1/auth/logout` | User logout | ✅ Implemented |
| POST | `/api/v1/auth/refresh` | Refresh JWT token | ✅ Implemented |
| POST | `/api/v1/auth/session/end` | End current session | ✅ Implemented |

### **Supervisor Endpoints (1 endpoint)**

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/v1/supervisor/override/login` | Supervisor override access | ✅ Implemented |

### **Policy Endpoints (1 endpoint)**

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/v1/policy/:deviceId` | Get device policy (JWS signed) | ✅ Implemented |

### **Telemetry Endpoints (1 endpoint)**

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/v1/telemetry` | Submit telemetry batch | ✅ Implemented |

---

## Authentication System

### **Auth Store Overview**

The authentication system uses Svelte 5 runes for reactive state management:

```typescript
// Import the auth store
import { auth } from '$lib/stores/auth';

// Access state
auth.state.isAuthenticated  // boolean
auth.state.isLoading       // boolean
auth.state.user           // User info or null
auth.state.error          // Error message or null

// Authentication actions
await auth.login(credentials);
await auth.logout();
await auth.initialize();
auth.clearError();
```

### **Login Flow Example**

```typescript
import { auth } from '$lib/stores/auth';

// Login with device credentials
const success = await auth.login({
  deviceId: 'dev-mock-001',
  userCode: 'u001',
  pin: '123456'
});

if (success) {
  console.log('Login successful');
  // User is now authenticated, tokens stored in cookies
} else {
  console.log('Login failed:', auth.state.error);
}
```

### **JWT Token Management**

Tokens are automatically managed in secure HTTP-only cookies:

- **Access Token**: 1 hour expiration, used for API calls
- **Refresh Token**: 7 days expiration, used for token refresh
- **Automatic Refresh**: Handled transparently when needed

### **Protected Routes**

Use the authentication context in route layouts:

```typescript
// +layout.svelte
import { setAuthContext, auth } from '$lib/stores/auth';

export const load = async () => {
  setAuthContext();
  await auth.initialize();

  return {
    // Auth state available to all child components
  auth: auth.state
  };
};
```

---

## Error Handling

### **API Error Types**

```typescript
interface ApiError {
  ok: false;
  error: {
    code: string;           // Error code (e.g., 'LOGIN_FAILED')
    message: string;         // Human-readable message
    request_id: string;      // Request tracking ID
  };
}
```

### **Common Error Codes**

- `UNAUTHORIZED` - Invalid credentials
- `LOGIN_FAILED` - Authentication failed
- `RATE_LIMITED` - Too many attempts (includes retry_after)
- `DEVICE_NOT_FOUND` - Device not found
- `SESSION_EXPIRED` - Session no longer valid
- `POLICY_ERROR` - Policy retrieval failed

### **Error Handling Examples**

```typescript
import { auth } from '$lib/stores/auth';

try {
  await auth.login(credentials);
} catch (error) {
  if (error.code === 'RATE_LIMITED') {
    console.log('Rate limited, try again later');
  } else {
    console.log('Login failed:', error.message);
  }
}
```

### **Retry Logic**

Built-in retry logic with exponential backoff:

```typescript
import { retryRequest } from '$lib/api/client';

// Retry up to 3 times with exponential backoff
await retryRequest(async () => {
  return await apiCall();
});
```

---

## Usage Examples

### **Basic API Usage**

```typescript
import { getCurrentUser } from '$lib/api';

// Get current user information
try {
  const userInfo = await getCurrentUser();
  console.log('User:', userInfo.user);
} catch (error) {
  console.error('Failed to get user:', error.message);
}
```

### **Policy Retrieval**

```typescript
import { getDevicePolicy, policyUtils } from '$lib/api';

// Get device policy
try {
  const policy = await getDevicePolicy({ deviceId: 'dev-mock-001' });

  // Check if policy is expired
  if (policyUtils.isPolicyExpired(policy.payload.meta.expires_at)) {
    console.log('Policy has expired');
  }

  // Check if current time is within allowed session windows
  if (policyUtils.isWithinSessionWindows(policy.payload.session.allowed_windows)) {
    console.log('Access allowed');
  }
} catch (error) {
  console.error('Failed to get policy:', error.message);
}
```

### **Supervisor Override**

```typescript
import { requestOverride } from '$lib/api';

// Request supervisor override
try {
  const override = await requestOverride({
    supervisor_pin: '789012',
    deviceId: 'dev-mock-001'
  });

  console.log('Override valid until:', override.override_until);
  console.log('Override token:', override.token);
} catch (error) {
  console.error('Override failed:', error.message);
}
```

### **Telemetry Submission**

```typescript
import { telemetryUtils, submitTelemetry } from '$lib/api';

// Create telemetry events
const events = [
  telemetryUtils.createHeartbeat('dev-mock-001', 85),
  telemetryUtils.createGPSEvent('dev-mock-001', 37.7749, -122.4194),
  telemetryUtils.createBatteryEvent('dev-mock-001', 75, false)
];

// Submit telemetry batch
try {
  const result = await submitTelemetry({
    events: events.map(event => JSON.stringify(event))
  });

  console.log('Telemetry submitted:', result);
  console.log('Accepted:', result.accepted);
  console.log('Dropped:', result.dropped);
} catch (error) {
  console.error('Telemetry submission failed:', error.message);
}
```

---

## Type Definitions

### **Core Types**

```typescript
// Authentication types
interface LoginRequest {
  deviceId: string;
  userCode: string;
  pin: string;
}

interface LoginResponse {
  ok: true;
  session: {
    session_id: string;
    user_id: string;
    started_at: string;
    expires_at: string;
    override_until: string | null;
  };
  access_token: string;
  refresh_token: string;
  policy_version: number;
}

// Policy types
interface PolicyResponse {
  ok: true;
  jws: string;  // JWS signed policy
  payload: {
    version: number;
    device_id: string;
    team_id: string;
    tz: string;
    time_anchor: {
      server_now_utc: string;
      max_clock_skew_sec: number;
      max_policy_age_sec: number;
    };
    session: {
      allowed_windows: Array<{
        days: string[];
        start: string;
        end: string;
      }>;
      grace_minutes: number;
      supervisor_override_minutes: number;
    };
    pin: {
      mode: string;
      min_length: number;
      retry_limit: number;
      cooldown_seconds: number;
    };
    gps: {
      active_fix_interval_minutes: number;
      min_displacement_m: number;
    };
    telemetry: {
      heartbeat_minutes: number;
      batch_max: number;
    };
    meta: {
      issued_at: string;
      expires_at: string;
    };
  };
}

// Telemetry types
interface TelemetryEvent {
  type: 'heartbeat' | 'gps' | 'app_usage' | 'screen_time' | 'battery' | 'network' | 'error';
  timestamp: string;  // ISO timestamp
  data: Record<string, any>;
}
```

---

## Testing Guide

### **Unit Testing Examples**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth } from '$lib/stores/auth';
import { loginUser } from '$lib/api';

// Mock API calls
vi.mock('$lib/api', () => ({
  loginUser: vi.fn(),
  authUtils: {
    setAuthTokens: vi.fn(),
    clearAuthTokens: vi.fn(),
    isAuthenticated: vi.fn()
  }
}));

describe('Authentication Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should login successfully', async () => {
    const mockResponse = {
      ok: true,
      session: { /* session data */ },
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token',
      policy_version: 3
    };

    loginUser.mockResolvedValue(mockResponse);

    const result = await auth.login({
      deviceId: 'test-device',
      userCode: 'test-user',
      pin: '123456'
    });

    expect(result).toBe(true);
    expect(auth.state.isAuthenticated).toBe(true);
    expect(auth.state.access_token).toBe('mock_access_token');
  });

  it('should handle login failure', async () => {
    const error = new Error('Invalid credentials');
    loginUser.mockRejectedValue(error);

    const result = await auth.login({
      deviceId: 'test-device',
      userCode: 'test-user',
      pin: 'wrong-pin'
    });

    expect(result).toBe(false);
    expect(auth.state.isAuthenticated).toBe(false);
    expect(auth.state.error).toBe('Invalid credentials');
  });
});
```

### **Integration Testing**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import LoginPage from '$routes/auth/login/+page.svelte';

describe('Login Page Integration', () => {
  it('should complete login flow', async () => {
    render(LoginPage);

    // Fill in login form
    const deviceIdInput = screen.getByLabelText('Device ID');
    const userCodeInput = screen.getByLabelText('User Code');
    const pinInput = screen.getByLabelText('PIN');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    await fireEvent.change(deviceIdInput, { target: { value: 'dev-mock-001' } });
    await fireEvent.change(userCodeInput, { target: { value: 'u001' } });
    await fireEvent.change(pinInput, { target: { value: '123456' } });

    // Submit form
    await fireEvent.click(submitButton);

    // Wait for successful login
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
```

---

## Environment Configuration

### **Required Environment Variables**

```bash
# SurveyLauncher Backend API URL
PUBLIC_SURVEY_LAUNCHER_API_URL=http://localhost:3000

# Admin session timeout (optional, defaults to 1 hour)
PUBLIC_ADMIN_SESSION_TIMEOUT_MS=3600000
```

### **Development Setup**

1. **Start the SurveyLauncher backend** (default: http://localhost:3000)
2. **Configure environment variables** in `.env`
3. **Run development server**:
   ```bash
   npm run dev
   ```

### **Sample Credentials for Testing**

Based on the backend execution plan, sample credentials are available:

```typescript
const sampleCredentials = {
  deviceId: 'dev-mock-001',
  userCode: 'u001',
  pin: '123456'
};

const sampleSupervisor = {
  supervisor_pin: '789012',
  deviceId: 'dev-mock-001'
};
```

---

## Troubleshooting

### **Common Issues**

1. **CORS Errors**: Ensure backend is running and CORS is configured
2. **Authentication Failures**: Check backend API is accessible
3. **TypeScript Errors**: Run `npm run check` to identify issues
4. **Build Errors**: Verify all dependencies are installed

### **Debug Mode**

Enable debug logging by setting environment variable:

```bash
DEBUG=true npm run dev
```

### **API Testing**

Use browser DevTools or curl to test API endpoints:

```bash
# Test login endpoint
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"dev-mock-001","userCode":"u001","pin":"123456"}'
```

---

## Security Considerations

1. **Token Storage**: Tokens stored in secure HTTP-only cookies
2. **HTTPS**: Required for production (enforced in cookie settings)
3. **Rate Limiting**: Handled by backend API
4. **Input Validation**: All inputs validated with Valibot schemas
5. **Error Handling**: Sensitive information not exposed in error messages

---

## Performance Optimizations

1. **Type Safety**: Compile-time error checking
2. **Caching**: HTTP caching headers respected
3. **Bundle Splitting**: Code split by routes automatically
4. **Tree Shaking**: Unused code eliminated in build process

---

## Future Enhancements

1. **WebSocket Integration**: Real-time updates for telemetry
2. **Offline Support**: Service worker for offline functionality
3. **Progressive Web App**: PWA capabilities for mobile admin
4. **Advanced Analytics**: Enhanced data visualization
5. **Multi-tenant Support**: Support for multiple organizations

This API integration layer provides a robust, type-safe foundation for the SurveyLauncher Admin Frontend, enabling seamless communication with the backend API while maintaining security and performance standards.