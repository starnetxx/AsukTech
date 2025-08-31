/**
 * Helper functions to ensure consistent plan duration handling
 * This prevents issues like displaying "2 Hours" when user purchased "1 Day"
 */

import { Plan } from '../types';

/**
 * Get the correct duration display based on duration hours
 * This ensures consistency across the application
 */
export function getCorrectDurationDisplay(durationHours: number): string {
  // Standard durations
  if (durationHours === 2) return '2 Hours';
  if (durationHours === 3) return '3 Hours';
  if (durationHours === 24) return '1 Day';
  if (durationHours === 48) return '2 Days';
  if (durationHours === 72) return '3 Days';
  if (durationHours === 168) return '1 Week';
  if (durationHours === 336) return '2 Weeks';
  if (durationHours === 720) return '1 Month';
  if (durationHours === 1440) return '2 Months';
  
  // Custom durations
  if (durationHours < 24) {
    return `${durationHours} ${durationHours === 1 ? 'Hour' : 'Hours'}`;
  } else if (durationHours % 168 === 0) {
    // Exact weeks
    const weeks = Math.floor(durationHours / 168);
    return `${weeks} ${weeks === 1 ? 'Week' : 'Weeks'}`;
  } else if (durationHours % 24 === 0) {
    // Exact days
    const days = Math.floor(durationHours / 24);
    return `${days} ${days === 1 ? 'Day' : 'Days'}`;
  } else {
    // Mixed duration - show most meaningful unit
    const days = Math.floor(durationHours / 24);
    const hours = durationHours % 24;
    if (days > 0 && hours > 0) {
      return `${days} ${days === 1 ? 'Day' : 'Days'} ${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
    } else if (days > 0) {
      return `${days} ${days === 1 ? 'Day' : 'Days'}`;
    } else {
      return `${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
    }
  }
}

/**
 * Calculate expiry date based on purchase date and duration hours
 */
export function calculateExpiryDate(purchaseDate: Date | string, durationHours: number): Date {
  const startDate = typeof purchaseDate === 'string' ? new Date(purchaseDate) : purchaseDate;
  return new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
}

/**
 * Get remaining time from an expiry date
 */
export function getRemainingTime(expiryDate: Date | string): string {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Expired';
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h remaining`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
}

/**
 * Validate that a plan's duration fields are consistent
 */
export function validatePlanDuration(plan: Plan): { valid: boolean; error?: string } {
  const expectedDisplay = getCorrectDurationDisplay(plan.durationHours);
  
  // Allow some flexibility in formatting
  const normalizeDisplay = (str: string) => 
    str.toLowerCase().replace(/\s+/g, '').replace(/s$/, '');
  
  const expectedNormalized = normalizeDisplay(expectedDisplay);
  const actualNormalized = normalizeDisplay(plan.duration);
  
  // Check if they're similar enough
  if (expectedNormalized === actualNormalized) {
    return { valid: true };
  }
  
  // Check for common variations
  const variations = {
    '1day': ['24hour', '24hr', 'daily', 'oneday'],
    '1week': ['7day', '168hour', 'weekly', 'oneweek'],
    '1month': ['30day', '720hour', 'monthly', 'onemonth'],
    '3hour': ['3hr', 'threehour'],
  };
  
  for (const [key, values] of Object.entries(variations)) {
    if (expectedNormalized.includes(key) || values.some(v => expectedNormalized.includes(v))) {
      if (actualNormalized.includes(key) || values.some(v => actualNormalized.includes(v))) {
        return { valid: true };
      }
    }
  }
  
  return {
    valid: false,
    error: `Duration mismatch: "${plan.duration}" doesn't match expected "${expectedDisplay}" for ${plan.durationHours} hours`
  };
}

/**
 * Get plan type from duration hours
 */
export function getPlanTypeFromHours(hours: number): Plan['type'] {
  switch (hours) {
    case 3: return '3-hour';
    case 24: return 'daily';
    case 168: return 'weekly';
    case 720: return 'monthly';
    default: return 'custom';
  }
}

/**
 * Format plan information for display
 */
export function formatPlanInfo(plan: Plan): {
  displayDuration: string;
  displayPrice: string;
  displayData: string;
  badge?: string;
} {
  return {
    displayDuration: getCorrectDurationDisplay(plan.durationHours),
    displayPrice: `₦${plan.price.toLocaleString()}`,
    displayData: plan.isUnlimited ? 'Unlimited' : `${plan.dataAmount} GB`,
    badge: plan.popular ? 'Popular' : undefined
  };
}

/**
 * Check if a plan duration conflicts with standard durations
 */
export function hasStandardDurationConflict(durationHours: number, type: Plan['type']): boolean {
  if (type === 'custom') {
    // Custom plans shouldn't use standard durations
    return [3, 24, 168, 720].includes(durationHours);
  } else {
    // Standard plans should use their designated duration
    const expectedHours = {
      '3-hour': 3,
      'daily': 24,
      'weekly': 168,
      'monthly': 720
    };
    return expectedHours[type] !== durationHours;
  }
}