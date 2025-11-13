# Supervisor Override Flow

## Overview
This workflow covers the supervisor override mechanism in SurveyLauncher, allowing authorized supervisors to bypass time window restrictions and extend device access during emergencies or special circumstances. The process includes PIN verification, override token generation, session extension, and comprehensive audit logging.

## Workflow Diagram

```mermaid
flowchart TD
    subgraph "Override Request" [Supervisor Override]
        BlockScreen[Blocker Activity<br/>Time window exceeded<br/>Access denied]
        OverrideDialog[Supervisor PIN Dialog<br/>Override request<br/>Reason entry]
    end

    subgraph "Backend API" [Override Service]
        OverrideAPI[POST /api/v1/supervisor/override/login<br/>Supervisor authentication]
        PINVerify[Supervisor PIN Verification<br/>Hash validation<br/>Team-specific PINs]
        OverrideToken[Override Token Generation<br/>2-hour validity<br/>Override scope]
        SessionExtend[Session Extension<br/>overrideUntil update<br/>Audit logging]
    end

    subgraph "Database" [Override Storage]
        SupPIN[(supervisorPins table)<br/>teamId, verifierHash<br/>rotatedAt, active]
        SessionTable[(sessions table)<br/>overrideUntil update<br/>Extension tracking]
        AuditLog[(Audit Records)<br/>Override events<br/>Supervisor actions]
    end

    subgraph "Device Recovery" [Session Recovery]
        SessionRecovery[Session Recovery<br/>Override token application<br/>Time window extension]
        FullAccess[Full Access Restored<br/>GPS tracking resumes<br/>Normal operations]
    end

    %% Override Flow
    BlockScreen --> OverrideDialog
    OverrideDialog --> |Supervisor PIN| OverrideAPI
    OverrideAPI --> PINVerify
    PINVerify --> |Validate hash| SupPIN
    PINVerify --> OverrideToken
    OverrideToken --> SessionExtend
    SessionExtend --> |Update session| SessionTable
    SessionExtend --> |Log override| AuditLog

    %% Recovery Flow
    OverrideToken --> |Return token| OverrideDialog
    OverrideDialog --> SessionRecovery
    SessionRecovery --> FullAccess

    %% Security Features
    OverrideAPI --> RateLimit[Override Rate Limit<br/>10 attempts/15min]
    OverrideAPI --> AuditTracking[Audit Tracking<br/>Complete override chain]

    style BlockScreen fill:#ffebee
    style OverrideDialog fill:#fff8e1
    style OverrideAPI fill:#f3e5f5
    style SupPIN fill:#fff8e1
    style SessionRecovery fill:#e8f5e8
```

## Detailed Process Steps

### 1. Override Trigger
1. **Time Window Violation**: Device detects access outside allowed hours
2. **Block Screen Display**: Show user-friendly blocking interface
3. **Override Option**: Present supervisor override request button
4. **User Interaction**: User clicks "Request Supervisor Override"

### 2. Override Request Interface

#### Android Override Dialog
```kotlin
class SupervisorOverrideDialog : DialogFragment() {
    private lateinit var pinInput: EditText
    private lateinit var reasonInput: EditText
    private lateinit var contactInfo: TextView

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        return AlertDialog.Builder(requireContext())
            .setTitle("Supervisor Override Required")
            .setView(R.layout.dialog_supervisor_override)
            .setPositiveButton("Request Override") { _, _ ->
                requestOverride()
            }
            .setNegativeButton("Cancel", null)
            .create()
    }

    private fun requestOverride() {
        val pin = pinInput.text.toString()
        val reason = reasonInput.text.toString()

        if (pin.length < 6) {
            showError("PIN must be at least 6 digits")
            return
        }

        if (reason.isBlank()) {
            showError("Please provide a reason for the override")
            return
        }

        // Show loading state
        showLoading()

        // Make API call
        supervisorOverrideService.requestOverride(pin, reason)
            .addOnSuccessListener { response ->
                handleOverrideSuccess(response)
            }
            .addOnFailureListener { error ->
                handleOverrideError(error)
            }
    }
}
```

#### User Interface Components
```xml
<!-- res/layout/dialog_supervisor_override.xml -->
<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:padding="24dp">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Access is currently outside allowed working hours."
        android:textSize="16sp"
        android:layout_marginBottom="16dp" />

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Please enter your supervisor PIN and reason for access:"
        android:textSize="14sp"
        android:layout_marginBottom="16dp" />

    <com.google.android.material.textfield.TextInputLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:hint="Supervisor PIN"
        style="@style/Widget.MaterialComponents.TextInputLayout.OutlinedBox">

        <com.google.android.material.textfield.TextInputEditText
            android:id="@+id/pinInput"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:inputType="numberPassword"
            android:maxLength="10" />

    </com.google.android.material.textfield.TextInputLayout>

    <com.google.android.material.textfield.TextInputLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:hint="Reason for override"
        style="@style/Widget.MaterialComponents.TextInputLayout.OutlinedBox">

        <com.google.android.material.textfield.TextInputEditText
            android:id="@+id/reasonInput"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:inputType="textMultiLine"
            android:maxLines="3" />

    </com.google.android.material.textfield.TextInputLayout>

    <TextView
        android:id="@+id/contactInfo"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Contact supervisor: +91-9876543210"
        android:textSize="12sp"
        android:textColor="@color/colorPrimary"
        android:layout_marginTop="16dp" />

</LinearLayout>
```

### 3. Backend Override Processing

#### API Endpoint Implementation
```typescript
// POST /api/v1/supervisor/override/login
export async function POST({ request }: APIEvent) {
  try {
    const body = await request.json();
    const { deviceId, supervisorPin, reason } = SupervisorOverrideRequestSchema.parse(body);

    // Validate device authentication
    const device = await validateDeviceJWT(request);
    if (device.id !== deviceId) {
      throw new Error('Device ID mismatch');
    }

    // Process override request
    const result = await processSupervisorOverride(device, supervisorPin, reason);

    return json({
      ok: true,
      override: {
        override_token: result.overrideToken,
        override_until: result.overrideUntil,
        duration_minutes: 120,
        reason: reason
      },
      audit: {
        request_id: result.requestId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('supervisor.override.failed', {
      error: error.message,
      deviceId: body?.deviceId,
      requestId: request.id
    });

    return json({
      ok: false,
      error: {
        code: 'override_failed',
        message: 'Supervisor override authentication failed'
      }
    }, { status: 401 });
  }
}
```

#### Override Processing Logic
```typescript
async function processSupervisorOverride(
  device: Device,
  supervisorPin: string,
  reason: string
): Promise<OverrideResult> {
  const requestId = generateRequestId();

  // Rate limiting check
  await checkOverrideRateLimit(device.id);

  // Verify supervisor PIN
  const supervisorPinRecord = await verifySupervisorPin(device.teamId, supervisorPin);

  // Generate override token
  const overrideToken = await generateOverrideToken(device, supervisorPinRecord);

  // Extend session
  const overrideUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  await extendDeviceSession(device.id, overrideUntil);

  // Log override event
  await logSupervisorOverride({
    deviceId: device.id,
    teamId: device.teamId,
    supervisorPinId: supervisorPinRecord.id,
    reason: reason,
    requestId: requestId,
    grantedAt: new Date(),
    expiresAt: overrideUntil
  });

  // Send notification to team admins
  await notifyAdminsOfOverride(device, reason, overrideUntil);

  return {
    overrideToken: overrideToken,
    overrideUntil: overrideUntil.toISOString(),
    requestId: requestId
  };
}
```

### 4. PIN Verification Process

#### Supervisor PIN Verification
```typescript
async function verifySupervisorPin(teamId: string, inputPin: string): Promise<SupervisorPin> {
  // Find active supervisor PIN for team
  const supervisorPinRecord = await db.query.supervisorPins.findFirst({
    where: and(
      eq(supervisorPins.teamId, teamId),
      eq(supervisorPins.active, true)
    )
  });

  if (!supervisorPinRecord) {
    throw new Error('No active supervisor PIN configured for team');
  }

  // Verify PIN hash
  const isValid = await scryptVerify(inputPin, supervisorPinRecord.verifierHash);
  if (!isValid) {
    // Record failed attempt
    await recordFailedOverrideAttempt(teamId, inputPin);
    throw new Error('Invalid supervisor PIN');
  }

  // Check PIN rotation status
  const daysSinceRotation = Math.floor(
    (Date.now() - supervisorPinRecord.rotatedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceRotation > 90) {
    logger.warn('supervisor.pin.expired', {
      teamId,
      pinId: supervisorPinRecord.id,
      daysSinceRotation
    });
  }

  return supervisorPinRecord;
}
```

#### Failed Attempt Tracking
```typescript
async function recordFailedOverrideAttempt(teamId: string, inputPin: string) {
  await db.insert(overrideAttempts).values({
    teamId,
    inputPinHash: await scryptHash(inputPin),
    attemptedAt: new Date(),
    ipAddress: clientIp,
    userAgent: userAgent
  });

  // Check for lockout condition
  const recentAttempts = await db.query.overrideAttempts.findMany({
    where: and(
      eq(overrideAttempts.teamId, teamId),
      gte(overrideAttempts.attemptedAt, new Date(Date.now() - 15 * 60 * 1000))
    )
  });

  if (recentAttempts.length >= 10) {
    // Trigger team override lockout
    await triggerTeamOverrideLockout(teamId);

    logger.warn('supervisor.override.lockout', {
      teamId,
      attemptCount: recentAttempts.length,
      window: '15 minutes'
    });
  }
}
```

### 5. Override Token Generation

#### JWT Override Token Structure
```typescript
interface OverrideTokenPayload {
  sub: string; // Device ID
  type: 'override';
  scope: 'supervisor_override';
  granted_by: string; // Supervisor PIN ID
  reason: string;
  granted_at: string;
  expires_at: string;
  jti: string; // Unique token identifier
  iat: number; // Issued at
  exp: number; // Expiration
}

async function generateOverrideToken(
  device: Device,
  supervisorPin: SupervisorPin
): Promise<string> {
  const payload: OverrideTokenPayload = {
    sub: device.id,
    type: 'override',
    scope: 'supervisor_override',
    granted_by: supervisorPin.id,
    reason: 'User requested supervisor override',
    granted_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    jti: generateUUID(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor((Date.now() + 2 * 60 * 60 * 1000) / 1000)
  };

  return await signJWT(payload, 'override');
}
```

### 6. Session Extension

#### Database Session Update
```typescript
async function extendDeviceSession(deviceId: string, overrideUntil: Date) {
  await db.update(sessions)
    .set({
      overrideUntil: overrideUntil,
      status: 'extended'
    })
    .where(and(
      eq(sessions.deviceId, deviceId),
      eq(sessions.status, 'open')
    ));

  // Log session extension
  await db.insert(sessionExtensions).values({
    deviceId,
    extendedAt: new Date(),
    expiresAt: overrideUntil,
    reason: 'supervisor_override'
  });
}
```

### 7. Device-Side Override Application

#### Override Token Usage
```kotlin
class SessionManager {
    private var overrideToken: String? = null
    private var overrideExpiresAt: Long = 0

    fun applySupervisorOverride(overrideToken: String, overrideUntil: String) {
        this.overrideToken = overrideToken
        this.overrideExpiresAt = parseISO8601(overrideUntil).time

        // Verify override token
        if (verifyOverrideToken(overrideToken)) {
            // Resume normal operations
            unblockDevice()
            startGpsService()
            showOverrideNotification()

            // Schedule override expiry check
            scheduleOverrideExpiryCheck()
        } else {
            // Invalid override token
            showError("Invalid override authorization")
        }
    }

    private fun verifyOverrideToken(token: String): Boolean {
        return try {
            val jwt = JWT.decode(token)
            val payload = jwt.getClaim("type").asString()
            val expiresAt = jwt.getClaim("exp").asLong() * 1000

            payload == "override" && expiresAt > System.currentTimeMillis()
        } catch (e: Exception) {
            false
        }
    }

    private fun scheduleOverrideExpiryCheck() {
        val delay = overrideExpiresAt - System.currentTimeMillis()
        if (delay > 0) {
            Handler(Looper.getMainLooper()).postDelayed({
                expireOverride()
            }, delay)
        }
    }

    private fun expireOverride() {
        overrideToken = null
        overrideExpiresAt = 0

        // Check if still within time window
        if (!isWithinTimeWindow()) {
            blockDevice()
        }

        showOverrideExpiredNotification()
    }
}
```

### 8. Audit Logging & Compliance

#### Comprehensive Audit Trail
```typescript
interface SupervisorOverrideAudit {
  id: string;
  deviceId: string;
  teamId: string;
  supervisorPinId: string;
  reason: string;
  grantedAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  requestId: string;
  ipAddress: string;
  userAgent: string;
  outcome: 'granted' | 'rejected' | 'expired' | 'revoked';
  metadata: Record<string, any>;
}

async function logSupervisorOverride(auditData: Partial<SupervisorOverrideAudit>) {
  const fullAuditData: SupervisorOverrideAudit = {
    id: generateUUID(),
    deviceId: auditData.deviceId!,
    teamId: auditData.teamId!,
    supervisorPinId: auditData.supervisorPinId!,
    reason: auditData.reason!,
    grantedAt: auditData.grantedAt!,
    expiresAt: auditData.expiresAt!,
    requestId: auditData.requestId!,
    ipAddress: clientIp,
    userAgent: userAgent,
    outcome: 'granted',
    metadata: {}
  };

  await db.insert(supervisorOverrideAudits).values(fullAuditData);

  // Log to external audit system
  await externalAuditLogger.log('supervisor_override', fullAuditData);
}
```

#### Admin Notification System
```typescript
async function notifyAdminsOfOverride(device: Device, reason: string, expiresAt: Date) {
  const teamAdmins = await getTeamAdmins(device.teamId);

  const notificationPayload = {
    type: 'supervisor_override',
    priority: 'high',
    deviceId: device.id,
    deviceName: getDeviceDisplayName(device),
    teamId: device.teamId,
    reason: reason,
    grantedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    requiresAttention: true
  };

  for (const admin of teamAdmins) {
    await sendNotification(admin.email, 'Supervisor Override Granted', notificationPayload);

    // Send push notification if available
    if (admin.pushToken) {
      await sendPushNotification(admin.pushToken, notificationPayload);
    }
  }
}
```

## Security Controls

### Rate Limiting
- **Override Attempts**: Maximum 10 attempts per team per 15 minutes
- **Team Lockout**: Automatic lockout after excessive failed attempts
- **Device Limiting**: Maximum 3 overrides per device per 24 hours
- **Global Thresholds**: System-wide override rate monitoring

### Authentication Security
- **PIN Complexity**: Minimum 6 digits, alphanumeric support
- **Hash Storage**: Scrypt with per-team salt
- **Token Security**: JWT with short expiration and unique JTI
- **Device Binding**: Override tokens tied to specific device

### Audit & Compliance
- **Complete Logging**: All override actions with full context
- **Immutable Records**: Write-once audit trail
- **Regulatory Compliance**: GDPR and data protection adherence
- **Reporting**: Automated compliance reports and alerts

## Error Handling

### Common Error Scenarios
1. **Invalid Supervisor PIN**:
   ```json
   {
     "ok": false,
     "error": {
       "code": "invalid_supervisor_pin",
       "message": "The supervisor PIN provided is incorrect"
     }
   }
   ```

2. **No Supervisor PIN Configured**:
   ```json
   {
     "ok": false,
     "error": {
       "code": "no_supervisor_pin",
       "message": "No supervisor PIN is configured for this team"
     }
   }
   ```

3. **Rate Limited**:
   ```json
   {
     "ok": false,
     "error": {
       "code": "override_rate_limited",
       "message": "Too many override attempts. Please try again later."
     }
   }
   ```

## Testing Scenarios

### Happy Path Tests
1. Valid supervisor PIN → Override granted → Session extended
2. Override token verification → Device unblocked → Normal operations
3. Override expiry → Device blocked if outside time window
4. Multiple overrides → Rate limiting respected

### Security Tests
1. Invalid PIN attempts → Rate limiting activation
2. Token tampering → Override rejection
3. Cross-device token usage → Authentication failure
4. Expired token usage → Override rejection

### Edge Cases
1. Supervisor PIN expired → Warning logged, override still granted
2. Network interruption during override → Local override state
3. Multiple simultaneous overrides → Single active override
4. Device offline during override → Graceful handling

## Monitoring & Analytics

### Key Metrics
- **Override Success Rate**: Percentage of successful override requests
- **Override Duration**: Average override extension time
- **Failed Override Rate**: Authentication failure percentage
- **Team Override Frequency**: Overrides per team per week

### Alerting Rules
- **High Override Rate**: Team with >10 overrides per day
- **PIN Sharing**: Same supervisor PIN used from multiple locations
- **Override Abuse**: Pattern of frequent overrides for same device
- **Security Incidents**: Failed override attempts spike

### Compliance Dashboard
1. **Override Activity Timeline**: Visual override request history
2. **Team Compliance**: Override frequency by team
3. **Security Events**: Failed attempts and lockouts
4. **Audit Trail**: Complete override action logs

---

**Dependencies**:
- Supervisor PIN management system
- JWT token service with override capability
- Audit logging infrastructure
- Notification system for admin alerts

**Configuration**:
- Override duration (default: 2 hours)
- Rate limiting thresholds
- PIN complexity requirements
- Compliance notification rules