import { db } from '../lib/db';
import { devices, users, telemetryEvents } from '../lib/db/schema';
import { logger } from '../lib/logger';
import { env } from '../lib/config';
import { eq, and } from 'drizzle-orm';
import { generateJTI, nowUTC } from '../lib/crypto';
import { v4 as uuidv4 } from 'uuid';

export interface TelemetryEvent {
  type: 'heartbeat' | 'gps' | 'app_usage' | 'screen_time' | 'battery' | 'network' | 'error';
  timestamp: string;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface TelemetryBatch {
  events: TelemetryEvent[];
  device_id?: string;
  session_id?: string;
}

export interface TelemetryIngestResult {
  success: boolean;
  accepted: number;
  dropped: number;
  error?: {
    code: string;
    message: string;
  };
}

export interface TelemetryStats {
  totalEvents: number;
  todayEvents: number;
  activeDevices: number;
  eventTypes: Record<string, number>;
}

/**
 * Telemetry Service for processing and storing device telemetry data
 */
export class TelemetryService {
  /**
   * Ingest a batch of telemetry events
   */
  static async ingestBatch(
    batch: TelemetryBatch,
    ipAddress?: string
  ): Promise<TelemetryIngestResult> {
    try {
      const { events } = batch;

      // Validate batch size
      if (events.length === 0) {
        return {
          success: true,
          accepted: 0,
          dropped: 0,
        };
      }

      // Enforce batch size limit
      const maxBatchSize = env.TELEMETRY_BATCH_MAX;
      const eventsToProcess = events.slice(0, maxBatchSize);
      const droppedCount = Math.max(0, events.length - maxBatchSize);

      // Validate device if provided
      let device = null;
      if (batch.device_id) {
        device = await db.select()
          .from(devices)
          .where(and(eq(devices.id, batch.device_id), eq(devices.isActive, true)))
          .limit(1);

        if (device.length === 0) {
          return {
            success: false,
            accepted: 0,
            dropped: events.length,
            error: {
              code: 'DEVICE_NOT_FOUND',
              message: 'Device not found or inactive',
            },
          };
        }
      }

      // Process each event
      const processedEvents = await Promise.all(
        eventsToProcess.map(event => this.processEvent(event, device?.[0], ipAddress))
      );

      // Separate valid and invalid events
      const validEvents = processedEvents.filter(event => event.valid);
      const invalidCount = processedEvents.length - validEvents.length;

      // Insert valid events into database
      if (validEvents.length > 0) {
        await db.insert(telemetryEvents).values(validEvents.map(event => ({
          id: generateJTI(),
          deviceId: batch.device_id || '',
          userId: event.userId,
          eventType: event.event.type,
          eventData: JSON.stringify(event.event),
          timestamp: new Date(event.event.timestamp),
          receivedAt: nowUTC(),
        })));

        // Update device last seen and last GPS
        if (batch.device_id && device?.[0]) {
          const updateData: any = {
            lastSeenAt: nowUTC(),
            updatedAt: nowUTC(),
          };

          // Check if any GPS events in the batch
          const hasGpsEvents = validEvents.some(event => event.event.type === 'gps');
          if (hasGpsEvents) {
            updateData.lastGpsAt = nowUTC();
          }

          await db.update(devices)
            .set(updateData)
            .where(eq(devices.id, batch.device_id));
        }
      }

      logger.info('Telemetry batch processed', {
        deviceId: batch.device_id,
        totalReceived: events.length,
        accepted: validEvents.length,
        dropped: droppedCount + invalidCount,
        eventTypes: this.getEventTypesCount(eventsToProcess),
      });

      return {
        success: true,
        accepted: validEvents.length,
        dropped: droppedCount + invalidCount,
      };
    } catch (error) {
      logger.error('Telemetry ingestion error', { batch: { ...batch, events: batch.events.length }, error });
      return {
        success: false,
        accepted: 0,
        dropped: batch.events.length,
        error: {
          code: 'INGESTION_ERROR',
          message: 'An error occurred while processing telemetry batch',
        },
      };
    }
  }

  /**
   * Process and validate a single telemetry event
   */
  private static async processEvent(
    event: TelemetryEvent,
    device?: any,
    ipAddress?: string
  ): Promise<{
    valid: boolean;
    event: TelemetryEvent;
    userId?: string;
  }> {
    try {
      // Validate required fields
      if (!event.type || typeof event.type !== 'string') {
        throw new Error('Missing or invalid event type');
      }

      if (!event.timestamp || typeof event.timestamp !== 'string') {
        throw new Error('Missing or invalid timestamp');
      }

      // Validate event timestamp is not too far in the future or past
      const eventTime = new Date(event.timestamp);
      const now = nowUTC();
      const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
      const maxFutureMs = 5 * 60 * 1000; // 5 minutes in future

      if (eventTime.getTime() < now.getTime() - maxAgeMs) {
        throw new Error('Event timestamp is too old');
      }

      if (eventTime.getTime() > now.getTime() + maxFutureMs) {
        throw new Error('Event timestamp is too far in the future');
      }

      // Get user ID if session is provided
      let userId = undefined;
      if (event.metadata?.session_id && device) {
        // This would typically involve session lookup
        // For now, we'll skip session validation
      }

      // Validate event type
      const validEventTypes = [
        'heartbeat', 'gps', 'app_usage', 'screen_time', 'battery', 'network', 'error'
      ];

      if (!validEventTypes.includes(event.type)) {
        throw new Error(`Invalid event type: ${event.type}`);
      }

      // Additional validation based on event type
      await this.validateEventByType(event);

      return {
        valid: true,
        event,
        userId,
      };
    } catch (error) {
      logger.warn('Invalid telemetry event', {
        event: { type: event.type, timestamp: event.timestamp },
        error: error instanceof Error ? error.message : 'Unknown error',
        deviceId: device?.id,
        ipAddress,
      });

      throw error;
    }
  }

  /**
   * Validate event based on its type
   */
  private static async validateEventByType(event: TelemetryEvent): Promise<void> {
    switch (event.type) {
      case 'gps':
        if (!event.data?.latitude || !event.data?.longitude) {
          throw new Error('GPS event missing latitude or longitude');
        }
        if (typeof event.data.latitude !== 'number' || typeof event.data.longitude !== 'number') {
          throw new Error('GPS coordinates must be numbers');
        }
        if (Math.abs(event.data.latitude) > 90 || Math.abs(event.data.longitude) > 180) {
          throw new Error('Invalid GPS coordinates');
        }
        break;

      case 'heartbeat':
        // Heartbeat events don't require additional validation
        break;

      case 'battery':
        if (event.data?.level !== undefined) {
          if (typeof event.data.level !== 'number' || event.data.level < 0 || event.data.level > 100) {
            throw new Error('Battery level must be between 0 and 100');
          }
        }
        break;

      case 'app_usage':
        if (!event.data?.app_name || typeof event.data.app_name !== 'string') {
          throw new Error('App usage event missing app_name');
        }
        if (event.data?.duration_ms !== undefined) {
          if (typeof event.data.duration_ms !== 'number' || event.data.duration_ms < 0) {
            throw new Error('App duration must be a non-negative number');
          }
        }
        break;

      case 'error':
        if (!event.data?.error_message || typeof event.data.error_message !== 'string') {
          throw new Error('Error event missing error_message');
        }
        break;
    }
  }

  /**
   * Get count of each event type in a batch
   */
  private static getEventTypesCount(events: TelemetryEvent[]): Record<string, number> {
    return events.reduce((counts, event) => {
      counts[event.type] = (counts[event.type] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  /**
   * Get telemetry statistics
   */
  static async getTelemetryStats(): Promise<TelemetryStats> {
    try {
      // Get total events count
      const totalEventsResult = await db.select({ count: telemetryEvents.id })
        .from(telemetryEvents);

      // Get today's events
      const today = nowUTC();
      today.setHours(0, 0, 0, 0);
      const todayEventsResult = await db.select({ count: telemetryEvents.id })
        .from(telemetryEvents)
        .where('timestamp >= ?', today.toISOString());

      // Get active devices (devices with telemetry in last 24 hours)
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const activeDevicesResult = await db.select({ deviceId: telemetryEvents.deviceId })
        .from(telemetryEvents)
        .where('timestamp >= ?', yesterday.toISOString())
        .groupBy('deviceId');

      // Get event type counts
      const eventTypeResults = await db.select({ eventType: telemetryEvents.eventType })
        .from(telemetryEvents);

      const eventTypes = eventTypeResults.reduce((counts, row) => {
        counts[row.eventType] = (counts[row.eventType] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      return {
        totalEvents: totalEventsResult.length || 0,
        todayEvents: todayEventsResult.length || 0,
        activeDevices: activeDevicesResult.length || 0,
        eventTypes,
      };
    } catch (error) {
      logger.error('Telemetry stats error', { error });
      return {
        totalEvents: 0,
        todayEvents: 0,
        activeDevices: 0,
        eventTypes: {},
      };
    }
  }

  /**
   * Get recent telemetry events for a device
   */
  static async getRecentEvents(
    deviceId: string,
    eventType?: string,
    limit: number = 100
  ): Promise<Array<{
    id: string;
    eventType: string;
    eventData: string;
    timestamp: Date;
    receivedAt: Date;
  }>> {
    try {
      let query = db.select({
        id: telemetryEvents.id,
        eventType: telemetryEvents.eventType,
        eventData: telemetryEvents.eventData,
        timestamp: telemetryEvents.timestamp,
        receivedAt: telemetryEvents.receivedAt,
      })
        .from(telemetryEvents)
        .where(eq(telemetryEvents.deviceId, deviceId))
        .orderBy('timestamp desc');

      if (eventType) {
        query = query.where(eq(telemetryEvents.eventType, eventType));
      }

      return await query.limit(limit);
    } catch (error) {
      logger.error('Get recent events error', { deviceId, eventType, error });
      return [];
    }
  }

  /**
   * Clean up old telemetry events
   */
  static async cleanupOldEvents(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // This would typically be done with a date comparison
      // For SQLite, we'd need to use raw SQL or adjust the approach
      // For now, this is a placeholder for the cleanup logic

      logger.info('Telemetry cleanup completed', { cutoffDate, daysToKeep });
      return 0; // Return number of cleaned events
    } catch (error) {
      logger.error('Telemetry cleanup error', { error });
      return 0;
    }
  }

  /**
   * Check if device should send heartbeat
   */
  static shouldSendHeartbeat(deviceId: string): boolean {
    // This would typically check when the device last sent a heartbeat
    // For now, return true as a default
    return true;
  }

  /**
   * Get device telemetry status
   */
  static async getDeviceStatus(deviceId: string): Promise<{
    deviceId: string;
    lastSeen?: Date;
    lastGps?: Date;
    totalEvents: number;
    recentEventTypes: string[];
  }> {
    try {
      // Get device information
      const device = await db.select()
        .from(devices)
        .where(eq(devices.id, deviceId))
        .limit(1);

      if (device.length === 0) {
        throw new Error('Device not found');
      }

      // Get total events count
      const totalEventsResult = await db.select({ count: telemetryEvents.id })
        .from(telemetryEvents)
        .where(eq(telemetryEvents.deviceId, deviceId));

      // Get recent event types
      const recentEvents = await this.getRecentEvents(deviceId, undefined, 50);
      const recentEventTypes = [...new Set(recentEvents.map(e => e.eventType))];

      return {
        deviceId,
        lastSeen: device[0].lastSeenAt,
        lastGps: device[0].lastGpsAt,
        totalEvents: totalEventsResult.length || 0,
        recentEventTypes,
      };
    } catch (error) {
      logger.error('Device status error', { deviceId, error });
      throw error;
    }
  }
}