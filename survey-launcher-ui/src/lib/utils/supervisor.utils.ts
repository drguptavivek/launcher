// Supervisor Utilities
// Helper functions for supervisor override functionality

export const supervisorUtils = {
	/**
	 * Set supervisor override token in cookies
	 */
	setOverrideToken(token: string, overrideUntil: string) {
		// This would typically be handled by the component calling this function
		// The token could be stored in memory or a secure cookie
		return {
			token,
			overrideUntil,
			expiresAt: new Date(overrideUntil)
		};
	},

	/**
	 * Check if override token is still valid
	 */
	isOverrideValid(overrideUntil: string): boolean {
		return new Date() < new Date(overrideUntil);
	},

	/**
	 * Get time remaining for override
	 */
	getOverrideTimeRemaining(overrideUntil: string): number {
		const now = new Date();
		const expiry = new Date(overrideUntil);
		return Math.max(0, expiry.getTime() - now.getTime());
	}
};