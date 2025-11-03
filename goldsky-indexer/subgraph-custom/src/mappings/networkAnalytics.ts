// ============================================================================
// EduVerse Network Analytics - EVENT-DRIVEN TRACKING
// ============================================================================
//
// NOTE: This file is a placeholder for future network analytics features.
//
// Current implementation uses event-based tracking via networkStatsHelper.ts
// which is called from individual event handlers in:
// - courseFactory.ts
// - courseLicense.ts
// - progressTracker.ts
// - certificateManager.ts
//
// All network statistics are updated through the helper function:
// updateNetworkStats(event, eventType)
//
// Block handlers and transaction handlers are DEPRECATED in The Graph v0.0.7+
// and have been removed from this implementation.
//
// For analytics queries, use:
// - NetworkStats entity (id: "network") for global metrics
// - DailyNetworkStats entity (id: YYYY-MM-DD) for daily breakdowns
// - PlatformStats entity (id: "platform") for platform-wide statistics
//
// ============================================================================

// This file intentionally left minimal to avoid conflicts with networkStatsHelper.ts
// All analytics logic is centralized in helpers/networkStatsHelper.ts

export {}; // Make this a module
