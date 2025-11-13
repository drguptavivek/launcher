// Telemetry Utilities
// Helper functions for telemetry event creation and management

import type { TelemetryEvent, TelemetryBatchRequest } from '$lib/api/remote/types';

export const telemetryUtils = {
	/**
	 * Create a telemetry event
	 */
	createEvent(type: TelemetryEvent['type'], data: Record<string, any>): TelemetryEvent {
		return {
			type,
			timestamp: new Date().toISOString(),
			data
		};
	},

	/**
	 * Create heartbeat event
	 */
	createHeartbeat(deviceId: string, batteryLevel?: number): TelemetryEvent {
		return this.createEvent('heartbeat', {
			deviceId,
			batteryLevel,
			appVersion: '1.0.0' // TODO: Get actual app version
		});
	},

	/**
	 * Create GPS event
	 */
	createGPSEvent(deviceId: string, latitude: number, longitude: number, accuracy?: number): TelemetryEvent {
		return this.createEvent('gps', {
			deviceId,
			latitude,
			longitude,
			accuracy,
			timestamp: new Date().toISOString()
		});
	},

	/**
	 * Create battery event
	 */
	createBatteryEvent(deviceId: string, level: number, isCharging: boolean): TelemetryEvent {
		return this.createEvent('battery', {
			deviceId,
			level,
			isCharging,
			voltage: null // TODO: Get actual voltage if available
		});
	},

	/**
	 * Create app usage event
	 */
	createAppUsageEvent(deviceId: string, packageName: string, duration: number): TelemetryEvent {
		return this.createEvent('app_usage', {
			deviceId,
			packageName,
			duration,
			timestamp: new Date().toISOString()
		});
	},

	/**
	 * Create screen time event
	 */
	createScreenTimeEvent(deviceId: string, duration: number, isActive: boolean): TelemetryEvent {
		return this.createEvent('screen_time', {
			deviceId,
			duration,
			isActive,
			timestamp: new Date().toISOString()
		});
	},

	/**
	 * Create network event
	 */
	createNetworkEvent(deviceId: string, connectionType: string, isConnected: boolean): TelemetryEvent {
		return this.createEvent('network', {
			deviceId,
			connectionType, // wifi, mobile, none
			isConnected,
			signalStrength: null // TODO: Get actual signal strength
		});
	},

	/**
	 * Create error event
	 */
	createErrorEvent(deviceId: string, errorType: string, errorMessage: string, stackTrace?: string): TelemetryEvent {
		return this.createEvent('error', {
			deviceId,
			errorType,
			errorMessage,
			stackTrace,
			timestamp: new Date().toISOString()
		});
	},

	/**
	 * Batch events for submission
	 */
	batchEvents(events: TelemetryEvent[]): TelemetryBatchRequest {
		return {
			events: events.slice(0, 50) // Ensure max 50 events
		};
	},

	/**
	 * Format telemetry data for display
	 */
	formatTelemetryForDisplay(events: TelemetryEvent[]) {
		return events.map(event => ({
			...event,
			prettyTime: new Date(event.timestamp).toLocaleString(),
			dataSummary: JSON.stringify(event.data, null, 2).slice(0, 100) + '...'
		}));
	}
};