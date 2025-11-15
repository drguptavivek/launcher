import { eq, and, like, desc, count, ne } from 'drizzle-orm';
import { db, devices, teams } from '../lib/db';
import { NewDevice, Device } from '../lib/db/schema';
import { logger } from '../lib/logger';
import { randomUUID } from 'crypto';

// Generate UUID for device IDs
function generateId(): string {
  return randomUUID();
}

// Response types
interface DeviceCreateResult {
  success: boolean;
  device?: Device;
  error?: {
    code: string;
    message: string;
  };
}

interface DeviceListResult {
  success: boolean;
  devices?: Device[];
  total?: number;
  error?: {
    code: string;
    message: string;
  };
}

interface DeviceUpdateResult {
  success: boolean;
  device?: Device;
  error?: {
    code: string;
    message: string;
  };
}

interface DeviceGetResult {
  success: boolean;
  device?: Device;
  error?: {
    code: string;
    message: string;
  };
}

interface DeviceDeleteResult {
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
}

export class DeviceService {
  // Create a new device
  static async createDevice(deviceData: {
    teamId: string;
    name: string;
    androidId?: string;
    appVersion?: string;
  }): Promise<DeviceCreateResult> {
    try {
      logger.info('Creating new device', {
        teamId: deviceData.teamId,
        name: deviceData.name,
        androidId: deviceData.androidId
      });

      // Validate required fields
      if (!deviceData.teamId || !deviceData.name) {
        return {
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'teamId and name are required',
          },
        };
      }

      // Validate team exists
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, deviceData.teamId))
        .limit(1);

      if (!team) {
        return {
          success: false,
          error: {
            code: 'TEAM_NOT_FOUND',
            message: 'Team not found',
          },
        };
      }

      // Check if Android ID already exists (if provided)
      if (deviceData.androidId) {
        const [existingDevice] = await db
          .select()
          .from(devices)
          .where(eq(devices.androidId, deviceData.androidId))
          .limit(1);

        if (existingDevice) {
          return {
            success: false,
            error: {
              code: 'ANDROID_ID_EXISTS',
              message: 'Android ID already exists',
            },
          };
        }
      }

      // Create new device
      const newDevice: NewDevice = {
        id: generateId(),
        teamId: deviceData.teamId,
        name: deviceData.name.trim(),
        androidId: deviceData.androidId?.trim() || null,
        appVersion: deviceData.appVersion?.trim() || null,
        isActive: true,
      };

      const [createdDevice] = await db.insert(devices).values(newDevice).returning();

      logger.info('Device created successfully', {
        deviceId: createdDevice.id,
        deviceName: createdDevice.name,
        teamId: createdDevice.teamId,
        androidId: createdDevice.androidId
      });

      return {
        success: true,
        device: createdDevice,
      };
    } catch (error) {
      logger.error('Error creating device', { error, deviceData });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create device',
        },
      };
    }
  }

  // List devices with pagination and search
  static async listDevices(options: {
    page?: number;
    limit?: number;
    search?: string;
    teamId?: string;
    isActive?: boolean;
  } = {}): Promise<DeviceListResult> {
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 50, 100);
      const offset = (page - 1) * limit;

      logger.info('Listing devices', { page, limit, options });

      let query = db
        .select({
          id: devices.id,
          teamId: devices.teamId,
          name: devices.name,
          androidId: devices.androidId,
          appVersion: devices.appVersion,
          isActive: devices.isActive,
          lastSeenAt: devices.lastSeenAt,
          lastGpsAt: devices.lastGpsAt,
          createdAt: devices.createdAt,
          updatedAt: devices.updatedAt,
        })
        .from(devices);

      // Add filters
      const conditions = [];

      if (options.search) {
        conditions.push(like(devices.name, `%${options.search}%`));
      }

      if (options.teamId) {
        conditions.push(eq(devices.teamId, options.teamId));
      }

      if (options.isActive !== undefined) {
        conditions.push(eq(devices.isActive, options.isActive));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Get total count for pagination
      const countQuery = db.select({ count: count() }).from(devices);
      const searchCountQuery = conditions.length > 0
        ? countQuery.where(and(...conditions))
        : countQuery;

      const countResult = await searchCountQuery;
      const [{ total }] = countResult;

      // Get paginated results
      const devicesList = await query
        .orderBy(desc(devices.createdAt))
        .limit(limit)
        .offset(offset);

      logger.info('Devices listed successfully', {
        count: devicesList.length,
        total,
        page
      });

      return {
        success: true,
        devices: devicesList,
        total,
      };
    } catch (error) {
      logger.error('Error listing devices', { error, options });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list devices',
        },
      };
    }
  }

  // Get device by ID
  static async getDevice(deviceId: string): Promise<DeviceGetResult> {
    try {
      if (!deviceId) {
        return {
          success: false,
          error: {
            code: 'MISSING_DEVICE_ID',
            message: 'Device ID is required',
          },
        };
      }

      logger.info('Getting device', { deviceId });

      const [device] = await db
        .select({
          id: devices.id,
          teamId: devices.teamId,
          name: devices.name,
          androidId: devices.androidId,
          appVersion: devices.appVersion,
          isActive: devices.isActive,
          lastSeenAt: devices.lastSeenAt,
          lastGpsAt: devices.lastGpsAt,
          createdAt: devices.createdAt,
          updatedAt: devices.updatedAt,
        })
        .from(devices)
        .where(eq(devices.id, deviceId))
        .limit(1);

      if (!device) {
        return {
          success: false,
          error: {
            code: 'DEVICE_NOT_FOUND',
            message: 'Device not found',
          },
        };
      }

      logger.info('Device retrieved successfully', {
        deviceId,
        deviceName: device.name
      });

      return {
        success: true,
        device,
      };
    } catch (error) {
      logger.error('Error getting device', { error, deviceId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get device',
        },
      };
    }
  }

  // Update device
  static async updateDevice(
    deviceId: string,
    updateData: {
      name?: string;
      androidId?: string;
      appVersion?: string;
      isActive?: boolean;
      lastSeenAt?: Date;
      lastGpsAt?: Date;
    }
  ): Promise<DeviceUpdateResult> {
    try {
      if (!deviceId) {
        return {
          success: false,
          error: {
            code: 'MISSING_DEVICE_ID',
            message: 'Device ID is required',
          },
        };
      }

      // Validate device exists
      const existingDevice = await this.getDevice(deviceId);
      if (!existingDevice.success) {
        return {
          success: false,
          error: existingDevice.error,
        };
      }

      logger.info('Updating device', { deviceId, updateData });

      // Check if Android ID conflicts with existing device (if being updated)
      if (updateData.androidId && updateData.androidId !== existingDevice.device?.androidId) {
        const [conflictingDevice] = await db
          .select()
          .from(devices)
          .where(and(
            eq(devices.androidId, updateData.androidId),
            // Exclude the current device being updated
            ne(devices.id, deviceId)
          ))
          .limit(1);

        if (conflictingDevice) {
          return {
            success: false,
            error: {
              code: 'ANDROID_ID_EXISTS',
              message: 'Android ID already exists on another device',
            },
          };
        }
      }

      // Prepare update object
      const updateFields: Partial<NewDevice> = {
        updatedAt: new Date(),
      };

      if (updateData.name !== undefined) {
        const nameTrimmed = updateData.name.trim();
        if (nameTrimmed.length === 0) {
          return {
            success: false,
            error: {
              code: 'INVALID_NAME',
              message: 'Device name cannot be empty',
            },
          };
        }
        updateFields.name = nameTrimmed;
      }

      if (updateData.androidId !== undefined) {
        updateFields.androidId = updateData.androidId?.trim() || null;
      }

      if (updateData.appVersion !== undefined) {
        updateFields.appVersion = updateData.appVersion?.trim() || null;
      }

      if (updateData.isActive !== undefined) {
        updateFields.isActive = updateData.isActive;
      }

      if (updateData.lastSeenAt !== undefined) {
        updateFields.lastSeenAt = updateData.lastSeenAt;
      }

      if (updateData.lastGpsAt !== undefined) {
        updateFields.lastGpsAt = updateData.lastGpsAt;
      }

      // Update device in database
      const [updatedDevice] = await db
        .update(devices)
        .set(updateFields)
        .where(eq(devices.id, deviceId))
        .returning();

      logger.info('Device updated successfully', {
        deviceId,
        deviceName: updatedDevice.name
      });

      return {
        success: true,
        device: updatedDevice,
      };
    } catch (error) {
      logger.error('Error updating device', { error, deviceId, updateData });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update device',
        },
      };
    }
  }

  // Delete device (soft delete by deactivating)
  static async deleteDevice(deviceId: string): Promise<DeviceDeleteResult> {
    try {
      if (!deviceId) {
        return {
          success: false,
          error: {
            code: 'MISSING_DEVICE_ID',
            message: 'Device ID is required',
          },
        };
      }

      logger.info('Deleting device', { deviceId });

      // Check if device exists
      const existingDevice = await this.getDevice(deviceId);
      if (!existingDevice.success) {
        return {
          success: false,
          error: existingDevice.error,
        };
      }

      // Soft delete by deactivating
      await db
        .update(devices)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(devices.id, deviceId));

      logger.info('Device deleted successfully', { deviceId });

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Error deleting device', { error, deviceId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete device',
        },
      };
    }
  }

  // Update device last seen timestamp
  static async updateLastSeen(deviceId: string): Promise<boolean> {
    try {
      const result = await db
        .update(devices)
        .set({
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(devices.id, deviceId));

      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error updating device last seen', { error, deviceId });
      return false;
    }
  }

  // Update device last GPS timestamp
  static async updateLastGps(deviceId: string): Promise<boolean> {
    try {
      const result = await db
        .update(devices)
        .set({
          lastGpsAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(devices.id, deviceId));

      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error updating device last GPS', { error, deviceId });
      return false;
    }
  }

  // Get device statistics
  static async getDeviceStats(teamId?: string): Promise<{
    success: boolean;
    stats?: {
      totalDevices: number;
      activeDevices: number;
      devicesWithGPS: number;
      devicesSeenLast24h: number;
    };
    error?: {
      code: string;
      message: string;
    };
  }> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      let deviceQuery = db
        .select({
          total: count(),
          active: count(),
          withGPS: count(),
          seenRecently: count(),
        })
        .from(devices);

      const conditions = [];
      if (teamId) {
        conditions.push(eq(devices.teamId, teamId));
      }

      if (conditions.length > 0) {
        deviceQuery = deviceQuery.where(and(...conditions));
      }

      // Note: SQLite doesn't support complex conditional counts in a single query
      // We'll do separate queries for more complex conditions
      const [{ total, active, withGPS }] = await deviceQuery;

      const seenRecentlyQuery = db
        .select({ count: count() })
        .from(devices)
        .where(and(
          ...conditions,
          devices.lastSeenAt && devices.lastSeenAt > twentyFourHoursAgo
        ));

      const [{ count: seenRecently }] = await seenRecentlyQuery;

      return {
        success: true,
        stats: {
          totalDevices: total || 0,
          activeDevices: active || 0,
          devicesWithGPS: withGPS || 0,
          devicesSeenLast24h: seenRecently || 0,
        },
      };
    } catch (error) {
      logger.error('Error getting device stats', { error, teamId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get device statistics',
        },
      };
    }
  }

  // Get devices by user (if user is assigned to device via active sessions)
  static async getDevicesByUser(userId: string): Promise<{
    success: boolean;
    devices?: Device[];
    error?: {
      code: string;
      message: string;
    };
  }> {
    try {
      // This would require joining with sessions table
      // For now, we'll return an empty implementation
      // In a real system, you'd join sessions with devices where the user has active sessions
      return {
        success: true,
        devices: [],
      };
    } catch (error) {
      logger.error('Error getting devices by user', { error, userId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get devices for user',
        },
      };
    }
  }
}