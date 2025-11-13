// Policy Utilities
// Helper functions for policy management and validation

export const policyUtils = {
	/**
	 * Parse and validate policy JWS token
	 */
	async parsePolicyJWS(jws: string) {
		// For now, return the JWS as-is
		// In a real implementation, you would verify the JWS signature
		// using the policy public key from the backend
		return {
			jws,
			valid: true,
			parsed: null // TODO: Implement JWS parsing
		};
	},

	/**
	 * Check if policy is expired
	 */
	isPolicyExpired(expiresAt: string): boolean {
		return new Date() >= new Date(expiresAt);
	},

	/**
	 * Get time until policy expires
	 */
	getPolicyTimeRemaining(expiresAt: string): number {
		const now = new Date();
		const expiry = new Date(expiresAt);
		return Math.max(0, expiry.getTime() - now.getTime());
	},

	/**
	 * Check if current time is within allowed session windows
	 */
	isWithinSessionWindows(
		sessionWindows: Array<{ days: string[]; start: string; end: string }>,
		currentDate: Date = new Date()
	): boolean {
		const currentDay = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
		const currentTime = currentDate.toTimeString().slice(0, 5); // HH:MM format

		return sessionWindows.some(window => {
			const isDayMatch = window.days.includes(currentDay);
			const isTimeMatch = currentTime >= window.start && currentTime <= window.end;
			return isDayMatch && isTimeMatch;
		});
	},

	/**
	 * Format session windows for display
	 */
	formatSessionWindows(windows: Array<{ days: string[]; start: string; end: string }>) {
		return windows.map(window => ({
			days: window.days.join(', '),
			timeRange: `${window.start} - ${window.end}`,
			isWeekend: window.days.every(day => ['Sat', 'Sun'].includes(day))
		}));
	}
};