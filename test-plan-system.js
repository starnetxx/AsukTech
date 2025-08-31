/**
 * Comprehensive test script for validating the plan system
 * Run this with: node test-plan-system.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test results storage
const testResults = [];

// Helper function to log test results
function logTest(testName, passed, message, details = null) {
  const result = { testName, passed, message, details };
  testResults.push(result);
  console.log(`${passed ? '✅' : '❌'} ${testName}: ${message}`);
  if (!passed && details) {
    console.log('   Details:', JSON.stringify(details, null, 2));
  }
}

// Test 1: Check plan duration consistency
async function testPlanDurationConsistency() {
  console.log('\n📋 Testing Plan Duration Consistency...\n');
  
  const { data: plans, error } = await supabase
    .from('plans')
    .select('*')
    .order('order', { ascending: true });

  if (error) {
    logTest('Load Plans', false, 'Failed to load plans', error);
    return;
  }

  logTest('Load Plans', true, `Loaded ${plans.length} plans`);

  // Check each plan
  for (const plan of plans) {
    // Validate duration hours match type
    const expectedHours = {
      '3-hour': 3,
      'daily': 24,
      'weekly': 168,
      'monthly': 720
    };

    if (plan.type !== 'custom') {
      const expected = expectedHours[plan.type];
      const actual = plan.duration_hours;
      
      logTest(
        `Plan Duration - ${plan.name}`,
        expected === actual,
        expected === actual 
          ? `Correct: ${actual} hours for ${plan.type} plan`
          : `Mismatch: Expected ${expected} hours, got ${actual} hours`,
        { plan: plan.name, type: plan.type, expected, actual }
      );
    } else {
      // Custom plans should have valid duration hours
      logTest(
        `Custom Plan - ${plan.name}`,
        plan.duration_hours > 0,
        plan.duration_hours > 0
          ? `Valid: ${plan.duration_hours} hours`
          : `Invalid: Duration hours must be > 0`,
        { plan: plan.name, duration_hours: plan.duration_hours }
      );
    }

    // Check duration description consistency
    const formatDuration = (hours) => {
      if (hours === 3) return '3 Hours';
      if (hours === 24) return '1 Day';
      if (hours === 168) return '1 Week';
      if (hours === 720) return '1 Month';
      
      if (hours < 24) {
        return `${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
      } else if (hours % 168 === 0) {
        const weeks = Math.floor(hours / 168);
        return `${weeks} ${weeks === 1 ? 'Week' : 'Weeks'}`;
      } else if (hours % 24 === 0) {
        const days = Math.floor(hours / 24);
        return `${days} ${days === 1 ? 'Day' : 'Days'}`;
      } else {
        return `${hours} Hours`;
      }
    };

    const expectedDescription = formatDuration(plan.duration_hours);
    const actualDescription = plan.duration;
    
    // Normalize for comparison
    const normalize = (str) => str.toLowerCase().replace(/\s+/g, '');
    const matches = normalize(expectedDescription) === normalize(actualDescription) ||
                   normalize(actualDescription).includes(normalize(expectedDescription).split(/hour|day|week|month/)[0]);
    
    logTest(
      `Duration Description - ${plan.name}`,
      matches,
      matches
        ? `Consistent: "${actualDescription}" matches ${plan.duration_hours} hours`
        : `Inconsistent: Expected "${expectedDescription}", got "${actualDescription}"`,
      { plan: plan.name, expected: expectedDescription, actual: actualDescription }
    );
  }
}

// Test 2: Check transaction expiry calculations
async function testTransactionExpiry() {
  console.log('\n📋 Testing Transaction Expiry Calculations...\n');
  
  // Get recent transactions with plan details
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      *,
      plans (
        name,
        duration_hours,
        type
      )
    `)
    .eq('type', 'plan_purchase')
    .not('plan_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    logTest('Load Transactions', false, 'Failed to load transactions', error);
    return;
  }

  logTest('Load Transactions', true, `Loaded ${transactions.length} transactions`);

  for (const tx of transactions) {
    if (!tx.plans) continue;
    
    const purchaseDate = new Date(tx.purchase_date || tx.created_at);
    const expectedExpiry = new Date(purchaseDate.getTime() + tx.plans.duration_hours * 60 * 60 * 1000);
    
    if (tx.expires_at) {
      const actualExpiry = new Date(tx.expires_at);
      const diffHours = Math.abs(expectedExpiry.getTime() - actualExpiry.getTime()) / (1000 * 60 * 60);
      
      logTest(
        `Expiry Calculation - ${tx.id.slice(0, 8)}`,
        diffHours <= 1, // Allow 1 hour tolerance
        diffHours <= 1
          ? `Correct: ${tx.plans.name} expires after ${tx.plans.duration_hours} hours`
          : `Incorrect: ${diffHours.toFixed(1)} hours difference`,
        {
          transaction: tx.id.slice(0, 8),
          plan: tx.plans.name,
          duration_hours: tx.plans.duration_hours,
          expected_expiry: expectedExpiry.toISOString(),
          actual_expiry: actualExpiry.toISOString()
        }
      );
    }
  }
}

// Test 3: Check credential availability across locations
async function testCredentialLocationCoverage() {
  console.log('\n📋 Testing Credential Location Coverage...\n');
  
  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('is_active', true);

  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true);

  const { data: credentials } = await supabase
    .from('credential_pools')
    .select('*');

  if (!locations || !plans || !credentials) {
    logTest('Load Data', false, 'Failed to load required data');
    return;
  }

  logTest('Load Data', true, `Loaded ${locations.length} locations, ${plans.length} plans, ${credentials.length} credentials`);

  // Check coverage
  for (const plan of plans) {
    const planCredentials = credentials.filter(c => c.plan_id === plan.id);
    const locationsWithPlan = new Set(planCredentials.map(c => c.location_id));
    const coverage = (locationsWithPlan.size / locations.length) * 100;
    
    logTest(
      `Plan Coverage - ${plan.name}`,
      coverage > 0 || credentials.length === 0,
      `${coverage.toFixed(0)}% location coverage (${locationsWithPlan.size}/${locations.length} locations)`,
      {
        plan: plan.name,
        locations_covered: locationsWithPlan.size,
        total_locations: locations.length,
        credentials_count: planCredentials.length
      }
    );
  }
}

// Test 4: Check for duplicate or conflicting plans
async function testPlanConflicts() {
  console.log('\n📋 Testing for Plan Conflicts...\n');
  
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true);

  if (!plans) {
    logTest('Load Plans', false, 'Failed to load plans');
    return;
  }

  // Check for duplicate names
  const nameMap = {};
  for (const plan of plans) {
    const nameLower = plan.name.toLowerCase();
    if (nameMap[nameLower]) {
      logTest(
        `Duplicate Name Check - ${plan.name}`,
        false,
        `Duplicate plan name found`,
        { plans: [nameMap[nameLower].id, plan.id] }
      );
    } else {
      nameMap[nameLower] = plan;
    }
  }

  // Check custom plans don't use standard durations
  const standardDurations = [3, 24, 168, 720];
  const customPlans = plans.filter(p => p.type === 'custom');
  
  for (const customPlan of customPlans) {
    const hasConflict = standardDurations.includes(customPlan.duration_hours);
    logTest(
      `Custom Plan Conflict - ${customPlan.name}`,
      !hasConflict,
      !hasConflict
        ? `No conflict: ${customPlan.duration_hours} hours`
        : `Warning: Uses standard duration (${customPlan.duration_hours} hours)`,
      { plan: customPlan.name, duration_hours: customPlan.duration_hours }
    );
  }
}

// Test 5: Validate active purchases
async function testActivePurchases() {
  console.log('\n📋 Testing Active Purchases...\n');
  
  const { data: activePurchases, error } = await supabase
    .from('transactions')
    .select(`
      *,
      plans (
        name,
        duration_hours
      )
    `)
    .eq('type', 'plan_purchase')
    .eq('status', 'active')
    .not('expires_at', 'is', null);

  if (error) {
    logTest('Load Active Purchases', false, 'Failed to load active purchases', error);
    return;
  }

  logTest('Load Active Purchases', true, `Found ${activePurchases.length} active purchases`);

  const now = new Date();
  for (const purchase of activePurchases) {
    const expiryDate = new Date(purchase.expires_at);
    const isExpired = expiryDate < now;
    
    if (isExpired) {
      logTest(
        `Active Purchase Status - ${purchase.id.slice(0, 8)}`,
        false,
        `Purchase marked as active but has expired`,
        {
          purchase_id: purchase.id.slice(0, 8),
          plan: purchase.plans?.name,
          expired_at: expiryDate.toISOString(),
          current_time: now.toISOString()
        }
      );
    }
  }
}

// Main test runner
async function runAllTests() {
  console.log('========================================');
  console.log('🧪 PLAN SYSTEM COMPREHENSIVE TEST SUITE');
  console.log('========================================');
  
  try {
    await testPlanDurationConsistency();
    await testTransactionExpiry();
    await testCredentialLocationCoverage();
    await testPlanConflicts();
    await testActivePurchases();
    
    // Summary
    console.log('\n========================================');
    console.log('📊 TEST SUMMARY');
    console.log('========================================\n');
    
    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed).length;
    const total = testResults.length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    
    if (failed > 0) {
      console.log('\n⚠️  Some tests failed. Please review the issues above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed! The plan system is working correctly.');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();