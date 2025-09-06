/**
 * Comprehensive test suite for plan duration handling
 * This ensures that plan durations are correctly assigned, calculated, and displayed
 */

import { Plan, Transaction } from '../types';

export interface PlanDurationTestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

/**
 * Test that plan duration hours are correctly set for each plan type
 */
export function testPlanDurationHours(plan: Plan): PlanDurationTestResult {
  const expectedHours: Record<string, number> = {
    '3-hour': 3,
    'daily': 24,
    'weekly': 168, // 24 * 7
    'monthly': 720, // 24 * 30
  };

  if (plan.type === 'custom') {
    // Custom plans should have valid duration hours
    const isValid = plan.durationHours > 0;
    return {
      testName: 'Plan Duration Hours - Custom',
      passed: isValid,
      message: isValid 
        ? `Custom plan "${plan.name}" has valid duration hours: ${plan.durationHours}`
        : `Custom plan "${plan.name}" has invalid duration hours: ${plan.durationHours}`,
      details: { plan, durationHours: plan.durationHours }
    };
  }

  const expected = expectedHours[plan.type];
  const actual = plan.durationHours;
  const passed = expected === actual;

  return {
    testName: `Plan Duration Hours - ${plan.type}`,
    passed,
    message: passed 
      ? `Plan "${plan.name}" has correct duration hours: ${actual}`
      : `Plan "${plan.name}" has incorrect duration hours. Expected: ${expected}, Got: ${actual}`,
    details: { plan, expected, actual }
  };
}

/**
 * Test that plan duration description matches the duration hours
 */
export function testPlanDurationDescription(plan: Plan): PlanDurationTestResult {
  const formatDuration = (hours: number): string => {
    if (hours === 2) return '2 Hours';
    if (hours === 3) return '3 Hours';
    if (hours === 24) return '1 Day';
    if (hours === 48) return '2 Days';
    if (hours === 168) return '1 Week';
    if (hours === 336) return '2 Weeks';
    if (hours === 720) return '1 Month';
    
    // For other durations
    if (hours < 24) {
      return `${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
    } else if (hours < 168) {
      const days = Math.floor(hours / 24);
      return `${days} ${days === 1 ? 'Day' : 'Days'}`;
    } else if (hours < 720) {
      const weeks = Math.floor(hours / 168);
      return `${weeks} ${weeks === 1 ? 'Week' : 'Weeks'}`;
    } else {
      const months = Math.floor(hours / 720);
      return `${months} ${months === 1 ? 'Month' : 'Months'}`;
    }
  };

  const expectedDescription = formatDuration(plan.durationHours);
  const actualDescription = plan.duration;
  
  // Allow some flexibility in description format
  const normalizeDescription = (desc: string) => 
    desc.toLowerCase().replace(/\s+/g, '').replace('hours', 'hour').replace('days', 'day').replace('weeks', 'week').replace('months', 'month');
  
  const passed = normalizeDescription(actualDescription).includes(normalizeDescription(expectedDescription).split(/hour|day|week|month/)[0]);

  return {
    testName: 'Plan Duration Description',
    passed,
    message: passed
      ? `Plan "${plan.name}" has consistent duration description: "${actualDescription}" for ${plan.durationHours} hours`
      : `Plan "${plan.name}" has inconsistent duration description. Expected something like: "${expectedDescription}", Got: "${actualDescription}"`,
    details: { plan, expectedDescription, actualDescription, durationHours: plan.durationHours }
  };
}

/**
 * Test that transaction expiry is correctly calculated based on plan duration
 */
export function testTransactionExpiry(transaction: Transaction, plan: Plan): PlanDurationTestResult {
  if (!transaction.expiresAt || !transaction.purchaseDate) {
    return {
      testName: 'Transaction Expiry Calculation',
      passed: false,
      message: `Transaction ${transaction.id} is missing expiry or purchase date`,
      details: { transaction, plan }
    };
  }

  const purchaseDate = new Date(transaction.purchaseDate);
  const expiryDate = new Date(transaction.expiresAt);
  const actualHoursDiff = Math.round((expiryDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60));
  const expectedHours = plan.durationHours;
  
  // Allow 1 hour tolerance for rounding
  const passed = Math.abs(actualHoursDiff - expectedHours) <= 1;

  return {
    testName: 'Transaction Expiry Calculation',
    passed,
    message: passed
      ? `Transaction expiry correctly calculated: ${actualHoursDiff} hours from purchase`
      : `Transaction expiry incorrect. Expected: ${expectedHours} hours, Got: ${actualHoursDiff} hours`,
    details: { 
      transaction: transaction.id, 
      plan: plan.name,
      purchaseDate: purchaseDate.toISOString(),
      expiryDate: expiryDate.toISOString(),
      expectedHours,
      actualHoursDiff
    }
  };
}

/**
 * Test that custom plans don't conflict with standard plans
 */
export function testCustomPlanCompatibility(plans: Plan[]): PlanDurationTestResult {
  const standardTypes = ['1-hour', '2-hour', '3-hour', 'daily', 'weekly', 'monthly'];
  const customPlans = plans.filter(p => p.type === 'custom');
  const standardPlans = plans.filter(p => standardTypes.includes(p.type));
  
  // Check for name conflicts
  const nameConflicts: string[] = [];
  customPlans.forEach(customPlan => {
    standardPlans.forEach(standardPlan => {
      if (customPlan.name.toLowerCase() === standardPlan.name.toLowerCase()) {
        nameConflicts.push(`"${customPlan.name}" conflicts with standard plan`);
      }
    });
  });

  // Check for duration conflicts (custom plan shouldn't exactly match standard durations)
  const durationWarnings: string[] = [];
  const standardDurations = [3, 24, 168, 720];
  customPlans.forEach(customPlan => {
    if (standardDurations.includes(customPlan.durationHours)) {
      durationWarnings.push(`Custom plan "${customPlan.name}" has standard duration (${customPlan.durationHours} hours)`);
    }
  });

  const passed = nameConflicts.length === 0;
  const warnings = durationWarnings.length > 0 ? ` Warnings: ${durationWarnings.join(', ')}` : '';

  return {
    testName: 'Custom Plan Compatibility',
    passed,
    message: passed
      ? `All custom plans are compatible with standard plans.${warnings}`
      : `Conflicts found: ${nameConflicts.join(', ')}`,
    details: { 
      customPlans: customPlans.length,
      standardPlans: standardPlans.length,
      conflicts: nameConflicts,
      warnings: durationWarnings
    }
  };
}

/**
 * Test that plans work correctly across different locations
 */
export function testPlanLocationCompatibility(
  plan: Plan, 
  locations: Array<{ id: string; name: string }>,
  credentials: Array<{ planId: string; locationId: string }>
): PlanDurationTestResult {
  const planCredentials = credentials.filter(c => c.planId === plan.id);
  const locationsWithPlan = new Set(planCredentials.map(c => c.locationId));
  const locationsWithoutPlan = locations.filter(l => !locationsWithPlan.has(l.id));

  const passed = locationsWithPlan.size > 0 || credentials.length === 0;
  
  return {
    testName: `Plan Location Compatibility - ${plan.name}`,
    passed,
    message: passed
      ? `Plan "${plan.name}" is available in ${locationsWithPlan.size} location(s)`
      : `Plan "${plan.name}" has no credentials in any location`,
    details: {
      plan: plan.name,
      locationsWithPlan: locationsWithPlan.size,
      totalLocations: locations.length,
      locationsWithoutPlan: locationsWithoutPlan.map(l => l.name)
    }
  };
}

/**
 * Run all plan duration tests
 */
export async function runAllPlanDurationTests(
  plans: Plan[],
  transactions: Transaction[],
  locations: Array<{ id: string; name: string }>,
  credentials: Array<{ planId: string; locationId: string }>
): Promise<PlanDurationTestResult[]> {
  const results: PlanDurationTestResult[] = [];

  // Test each plan's duration hours
  plans.forEach(plan => {
    results.push(testPlanDurationHours(plan));
    results.push(testPlanDurationDescription(plan));
    results.push(testPlanLocationCompatibility(plan, locations, credentials));
  });

  // Test custom plan compatibility
  results.push(testCustomPlanCompatibility(plans));

  // Test transactions
  transactions.forEach(transaction => {
    if (transaction.planId) {
      const plan = plans.find(p => p.id === transaction.planId);
      if (plan) {
        results.push(testTransactionExpiry(transaction, plan));
      }
    }
  });

  return results;
}

/**
 * Format test results for display
 */
export function formatTestResults(results: PlanDurationTestResult[]): string {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  let output = `\n=== Plan Duration Test Results ===\n`;
  output += `Total: ${total} | Passed: ${passed} | Failed: ${failed}\n\n`;

  // Group by test type
  const byTestName = results.reduce((acc, result) => {
    const baseName = result.testName.split(' - ')[0];
    if (!acc[baseName]) acc[baseName] = [];
    acc[baseName].push(result);
    return acc;
  }, {} as Record<string, PlanDurationTestResult[]>);

  Object.entries(byTestName).forEach(([testType, testResults]) => {
    output += `\n${testType}:\n`;
    testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      output += `  ${status} ${result.message}\n`;
      if (!result.passed && result.details) {
        output += `     Details: ${JSON.stringify(result.details, null, 2).split('\n').join('\n     ')}\n`;
      }
    });
  });

  return output;
}

/**
 * Validate a single plan before saving
 */
export function validatePlan(plan: Partial<Plan>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!plan.name || plan.name.trim() === '') {
    errors.push('Plan name is required');
  }

  if (!plan.duration || plan.duration.trim() === '') {
    errors.push('Duration description is required');
  }

  if (!plan.durationHours || plan.durationHours <= 0) {
    errors.push('Duration hours must be greater than 0');
  }

  if (!plan.price || plan.price <= 0) {
    errors.push('Price must be greater than 0');
  }

  if (!plan.type) {
    errors.push('Plan type is required');
  }

  // Validate duration consistency
  if (plan.type && plan.durationHours) {
    const standardDurations: Record<string, number> = {
      '3-hour': 3,
      'daily': 24,
      'weekly': 168,
      'monthly': 720,
    };

    if (plan.type !== 'custom' && standardDurations[plan.type] !== plan.durationHours) {
      errors.push(`Duration hours (${plan.durationHours}) doesn't match plan type (${plan.type})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}