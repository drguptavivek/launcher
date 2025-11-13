# Telemetry Collection & Processing Flow

## Overview
This workflow covers the complete telemetry pipeline in SurveyLauncher, including GPS location tracking, heartbeat monitoring, event batching, validation processing, and real-time analytics for Android device monitoring.

## Workflow Diagram

```mermaid
flowchart TD
    subgraph "Android Device" [Telemetry Generation]
        GPS[GPS Service<br/>3-min intervals<br/>50m displacement]
        Heartbeat[Heartbeat Service<br/>10-min intervals<br/>Battery status]
        AppUsage[App Usage Tracking<br/>Screen time<br/>Application events]
        Events[System Events<br/>Network, Battery<br/>Error conditions]
    end

    subgraph "Batch Processing" [Telemetry Batching]
        Collect[Collect Events<br/>Max 50 events]
        Validate[Validate Events<br/>• GPS coordinates<br/>• Battery ranges<br/>• Timestamp validation]
        Batch[Create Batch<br/>JSON array<br/>Device metadata]
    end

    subgraph "Backend API" [Telemetry Service]
        TelemetryAPI[POST /api/v1/telemetry<br/>Batch ingestion]
        ProcessEvents[Event Processing<br/>• Type validation<br/>• Data integrity<br/>• Age verification]
        StoreEvents[Database Storage<br/>Event categorization<br/>Device tracking]
        DeviceUpdate[Device Status Update<br/>lastSeenAt, lastGpsAt]
    end

    subgraph "Database" [Telemetry Storage]
        EventTable[(telemetryEvents table)<br/>deviceId, sessionId<br/>type, payloadJson, ts]
        DeviceTable[(devices table)<br/>Activity tracking]
        SessionTable[(sessions table)<br/>Event correlation]
    end

    subgraph "Analytics" [Data Consumption]
        RealTime[Real-time Dashboard<br/>Device status<br/>GPS tracking]
        Analytics[Analytics Engine<br/>Usage patterns<br/>Performance metrics]
        Reports[Reporting System<br/>Historical data<br/>Compliance reports]
    end

    %% Telemetry Flow
    GPS --> Collect
    Heartbeat --> Collect
    AppUsage --> Collect
    Events --> Collect

    Collect --> Validate
    Validate --> Batch
    Batch --> |HTTPS POST| TelemetryAPI

    TelemetryAPI --> ProcessEvents
    ProcessEvents --> StoreEvents
    ProcessEvents --> DeviceUpdate

    StoreEvents --> EventTable
    DeviceUpdate --> DeviceTable
    DeviceUpdate --> SessionTable

    %% Analytics Flow
    EventTable --> RealTime
    EventTable --> Analytics
    EventTable --> Reports

    style GPS fill:#e3f2fd
    style Heartbeat fill:#e3f2fd
    style Collect fill:#f3e5f5
    style TelemetryAPI fill:#f3e5f5
    style EventTable fill:#fff8e1
    style RealTime fill:#e8f5e8
```

## Telemetry Event Types

### 1. GPS Location Events
```json
{
  "t": "gps",
  "ts": "2025-01-01T10:03:00Z",
  "lat": 28.5642,
  "lon": 77.2019,
  "acc_m": 6.8,
  "alt_m": 215.5,
  "speed_mps": 0.0,
  "bearing_deg": null,
  "provider": "gps"
}
```

### 2. Heartbeat Events
```json
{
  "t": "heartbeat",
  "ts": "2025-01-01T10:00:00Z",
  "battery": 0.85,
  "charging": false,
  "network_type": "wifi",
  "signal_strength": -65,
  "storage_mb": 2048,
  "memory_mb": 1024
}
```

### 3. App Usage Events
```json
{
  "t": "app_usage",
  "ts": "2025-01-01T10:05:00Z",
  "package_name": "com.surveylauncher.app",
  "app_name": "SurveyLauncher",
  "duration_seconds": 300,
  "foreground": true
}
```

### 4. System Events
```json
{
  "t": "network",
  "ts": "2025-01-01T10:01:00Z",
  "type": "connected",
  "network_type": "wifi",
  "ssid": "Office-WiFi"
}
```

## Detailed Process Steps

### 1. Event Generation (Android Device)

#### GPS Service Configuration
```kotlin
// Android GPS service setup
class LocationService : Service() {
    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            result.locations.forEach { location ->
                if (shouldReportLocation(location)) {
                    val event = createGpsEvent(location)
                    eventBatcher.addEvent(event)
                }
            }
        }
    }

    private fun shouldReportLocation(location: Location): Boolean {
        // 3-minute interval check
        val timeSinceLast = System.currentTimeMillis() - lastReportTime
        if (timeSinceLast < 3 * 60 * 1000) return false

        // 50-meter displacement check
        if (lastLocation != null) {
            val distance = lastLocation!!.distanceTo(location)
            if (distance < 50.0) return false
        }

        return true
    }
}
```

#### Heartbeat Service
```kotlin
// Periodic heartbeat reporting
class HeartbeatService {
    private val heartbeatInterval = 10 * 60 * 1000L // 10 minutes

    private val heartbeatRunnable = object : Runnable {
        override fun run() {
            val heartbeat = createHeartbeatEvent()
            eventBatcher.addEvent(heartbeat)
            handler.postDelayed(this, heartbeatInterval)
        }
    }

    private fun createHeartbeatEvent(): TelemetryEvent {
        return TelemetryEvent(
            type = "heartbeat",
            timestamp = Instant.now(),
            payload = mapOf(
                "battery" to getBatteryLevel(),
                "charging" to isCharging(),
                "network_type" to getNetworkType(),
                "signal_strength" to getSignalStrength()
            )
        )
    }
}
```

### 2. Event Batching

#### Batch Collection Logic
```kotlin
class TelemetryBatcher {
    private val maxBatchSize = 50
    private val maxBatchAge = 5 * 60 * 1000L // 5 minutes
    private val eventQueue = mutableListOf<TelemetryEvent>()

    fun addEvent(event: TelemetryEvent) {
        synchronized(eventQueue) {
            eventQueue.add(event)

            if (shouldFlushBatch()) {
                flushBatch()
            }
        }
    }

    private fun shouldFlushBatch(): Boolean {
        return eventQueue.size >= maxBatchSize ||
               (!eventQueue.isEmpty() &&
                System.currentTimeMillis() - firstEventTimestamp > maxBatchAge)
    }

    private fun flushBatch() {
        val batch = eventQueue.toList()
        eventQueue.clear()

        // Send batch to server
        scope.launch {
            try {
                telemetryService.sendBatch(batch)
            } catch (e: Exception) {
                // Retry logic
                retryBatch(batch)
            }
        }
    }
}
```

#### Batch Format
```json
{
  "device_id": "device-uuid",
  "session_id": "session-uuid",
  "events": [
    {
      "t": "gps",
      "ts": "2025-01-01T10:03:00Z",
      "lat": 28.5642,
      "lon": 77.2019,
      "acc_m": 6.8
    },
    {
      "t": "heartbeat",
      "ts": "2025-01-01T10:00:00Z",
      "battery": 0.85
    }
  ]
}
```

### 3. Server-Side Processing

#### API Endpoint
```typescript
// POST /api/v1/telemetry
export async function POST({ request }: APIEvent) {
  try {
    const batch = await TelemetryBatchSchema.parseAsync(await request.json());

    // Validate device authentication
    const device = await validateDeviceJWT(request);

    // Process events
    const results = await processTelemetryBatch(batch, device);

    return json({
      ok: true,
      accepted: results.accepted,
      rejected: results.rejected,
      batch_id: results.batchId
    });

  } catch (error) {
    return json({
      ok: false,
      error: {
        code: 'invalid_batch',
        message: error.message
      }
    }, { status: 400 });
  }
}
```

#### Event Processing Pipeline
```typescript
async function processTelemetryBatch(batch: TelemetryBatch, device: Device) {
  const results = {
    accepted: 0,
    rejected: 0,
    batchId: generateBatchId()
  };

  for (const event of batch.events) {
    try {
      // Validate event structure
      const validatedEvent = await validateEvent(event);

      // Additional event-type specific validation
      await validateEventType(validatedEvent);

      // Store event
      await storeTelemetryEvent(validatedEvent, device, batch.session_id);

      // Update device status
      await updateDeviceStatus(device, validatedEvent);

      results.accepted++;

    } catch (error) {
      logger.warn('telemetry.event_rejected', {
        deviceId: device.id,
        eventType: event.t,
        error: error.message,
        batchId: results.batchId
      });

      results.rejected++;
    }
  }

  // Publish to analytics queue
  await analyticsQueue.add({
    type: 'telemetry_batch_processed',
    deviceId: device.id,
    results,
    timestamp: new Date().toISOString()
  });

  return results;
}
```

### 4. Event Validation

#### GPS Coordinate Validation
```typescript
function validateGpsEvent(event: any): void {
  // Latitude range: -90 to 90
  if (event.lat < -90 || event.lat > 90) {
    throw new Error('Invalid latitude coordinate');
  }

  // Longitude range: -180 to 180
  if (event.lon < -180 || event.lon > 180) {
    throw new Error('Invalid longitude coordinate');
  }

  // Accuracy check
  if (event.acc_m && (event.acc_m < 0 || event.acc_m > 1000)) {
    throw new Error('Invalid GPS accuracy');
  }

  // Speed check (if present)
  if (event.speed_mps !== undefined && event.speed_mps < 0) {
    throw new Error('Invalid speed value');
  }
}
```

#### Battery Validation
```typescript
function validateBatteryEvent(event: any): void {
  // Battery percentage: 0 to 1
  if (event.battery < 0 || event.battery > 1) {
    throw new Error('Invalid battery percentage');
  }

  // Charging status must be boolean
  if (event.charging !== undefined && typeof event.charging !== 'boolean') {
    throw new Error('Invalid charging status');
  }
}
```

#### Timestamp Validation
```typescript
function validateEventTimestamp(timestamp: string): void {
  const eventTime = new Date(timestamp);
  const now = new Date();

  // Event must not be in future (allow 5 minutes clock skew)
  const maxFutureTime = new Date(now.getTime() + 5 * 60 * 1000);
  if (eventTime > maxFutureTime) {
    throw new Error('Event timestamp is too far in future');
  }

  // Event must not be older than 24 hours
  const maxPastTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (eventTime < maxPastTime) {
    throw new Error('Event timestamp is too old');
  }
}
```

### 5. Database Storage

#### Event Storage Schema
```sql
-- telemetryEvents table
CREATE TABLE telemetryEvents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deviceId UUID NOT NULL REFERENCES devices(id),
  sessionId UUID REFERENCES sessions(id),
  type VARCHAR(32) NOT NULL,
  payloadJson JSONB NOT NULL,
  ts TIMESTAMP WITH TIME ZONE NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX idx_telem_device_ts ON telemetryEvents(deviceId, ts DESC);
CREATE INDEX idx_telem_session_ts ON telemetryEvents(sessionId, ts DESC);
CREATE INDEX idx_telem_type ON telemetryEvents(type);
CREATE INDEX idx_telem_processed ON telemetryEvents(processed) WHERE processed = FALSE;
```

#### Event Storage Implementation
```typescript
async function storeTelemetryEvent(
  event: ValidatedEvent,
  device: Device,
  sessionId?: string
) {
  await db.insert(telemetryEvents).values({
    deviceId: device.id,
    sessionId: sessionId || null,
    type: event.t,
    payloadJson: event.payload,
    ts: event.timestamp,
    createdAt: new Date()
  });

  // Update device last seen
  await db.update(devices)
    .set({ lastSeenAt: new Date() })
    .where(eq(devices.id, device.id));

  // Update last GPS if this is a GPS event
  if (event.t === 'gps' && event.payload.lat && event.payload.lon) {
    await db.update(devices)
      .set({
        lastGpsAt: new Date(),
        lastGpsLat: event.payload.lat,
        lastGpsLon: event.payload.lon
      })
      .where(eq(devices.id, device.id));
  }
}
```

## Real-Time Analytics

### Live Dashboard Updates
```typescript
// WebSocket for real-time updates
class TelemetryWebSocket {
  private connections = new Map<string, WebSocket>();

  handleConnection(ws: WebSocket, deviceId: string) {
    this.connections.set(deviceId, ws);

    ws.on('close', () => {
      this.connections.delete(deviceId);
    });
  }

  broadcastDeviceUpdate(deviceId: string, data: any) {
    const ws = this.connections.get(deviceId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'device_update',
        deviceId,
        data,
        timestamp: new Date().toISOString()
      }));
    }
  }
}
```

### GPS Tracking Visualization
```typescript
// Real-time GPS processing
async function processGpsEvent(event: GpsEvent, device: Device) {
  // Store in time-series database for efficient queries
  await timeSeriesDb.insert({
    measurement: 'device_locations',
    tags: {
      deviceId: device.id,
      teamId: device.teamId
    },
    fields: {
      latitude: event.lat,
      longitude: event.lon,
      accuracy: event.acc_m,
      altitude: event.alt_m
    },
    timestamp: new Date(event.ts)
  });

  // Check for geofence violations
  await checkGeofenceCompliance(device, event);

  // Update real-time dashboard
  dashboardService.updateDeviceLocation(device.id, {
    lat: event.lat,
    lon: event.lon,
    accuracy: event.acc_m,
    timestamp: event.ts
  });
}
```

## Performance Optimization

### Batch Processing Strategy
- **Batch Size**: Maximum 50 events per batch
- **Flush Interval**: 5 minutes maximum age
- **Retry Logic**: Exponential backoff for failed uploads
- **Compression**: Gzip compression for large batches

### Database Optimization
```sql
-- Partitioning by date for large datasets
CREATE TABLE telemetryEvents_2025_01 PARTITION OF telemetryEvents
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Time-series database for GPS data
CREATE TABLE deviceLocations (
  time TIMESTAMP WITH TIME ZONE NOT NULL,
  deviceId UUID NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION
);

-- Hypertable for efficient time-series queries
SELECT create_hypertable('deviceLocations', 'time');
```

### Caching Strategy
- **Redis Cache**: Device status and recent GPS locations
- **CDN**: Static telemetry reports and analytics
- **Materialized Views**: Pre-aggregated telemetry statistics

## Error Handling & Recovery

### Client-Side Error Handling
```kotlin
class TelemetryService {
    private suspend fun sendBatch(batch: List<TelemetryEvent>) {
        try {
            val response = httpClient.post(url) {
                setBody(Json.encodeToString(BatchSerializer, batch))
                header("Authorization", "Bearer $jwtToken")
                header("Content-Type", "application/json")
            }

            if (!response.status.isSuccess()) {
                handleErrorResponse(response.status.value)
            }

        } catch (e: IOException) {
            // Store locally for retry when network is available
            localStorage.storeBatch(batch)
        }
    }

    private suspend fun retryStoredBatches() {
        val storedBatches = localStorage.getStoredBatches()
        storedBatches.forEach { batch ->
            if (sendBatch(batch)) {
                localStorage.removeBatch(batch.id)
            }
        }
    }
}
```

### Server-Side Error Handling
```typescript
class TelemetryProcessor {
  async processWithRetry(batch: TelemetryBatch, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.processBatch(batch);
      } catch (error) {
        if (attempt === maxRetries) {
          // Store failed batch for manual review
          await this.storeFailedBatch(batch, error);
          throw error;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
```

## Monitoring & Analytics

### Key Performance Metrics
- **Throughput**: Events processed per second
- **Latency**: End-to-end event processing time
- **Error Rate**: Failed event processing percentage
- **Storage Growth**: Database size growth rate

### Real-Time Dashboards
1. **Device Status Map**: Live GPS tracking of all devices
2. **Telemetry Volume**: Real-time event ingestion rate
3. **Battery Analytics**: Device battery health monitoring
4. **Network Performance**: Connectivity and data transfer metrics

### Alerting Rules
- **High Error Rate**: >5% event processing failures
- **GPS Anomalies**: Devices with invalid coordinates
- **Battery Critical**: Devices with <10% battery
- **Offline Devices**: Devices not reporting for >1 hour

---

**Dependencies**:
- Android Location Services API
- Network connectivity monitoring
- Time-series database (InfluxDB/TimescaleDB)
- Real-time analytics platform

**Configuration**:
- GPS accuracy thresholds
- Batching parameters
- Retry policies
- Data retention policies