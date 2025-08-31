import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useData } from '../../contexts/DataContext';
import { 
  runAllPlanDurationTests, 
  formatTestResults,
  PlanDurationTestResult 
} from '../../utils/planDurationTests';
import { CheckCircle, XCircle, AlertCircle, Play, RefreshCw } from 'lucide-react';

export const PlanTestRunner: React.FC = () => {
  const { plans, getAllPurchases, locations, credentials } = useData();
  const [testResults, setTestResults] = useState<PlanDurationTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const allPurchases = getAllPurchases();
      const results = await runAllPlanDurationTests(
        plans,
        allPurchases,
        locations,
        credentials.map(c => ({ planId: c.planId, locationId: c.locationId }))
      );
      setTestResults(results);
      setLastRunTime(new Date());
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getTestStats = () => {
    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed).length;
    const total = testResults.length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    return { passed, failed, total, passRate };
  };

  const stats = getTestStats();

  // Group results by test type
  const groupedResults = testResults.reduce((acc, result) => {
    const baseName = result.testName.split(' - ')[0];
    if (!acc[baseName]) acc[baseName] = [];
    acc[baseName].push(result);
    return acc;
  }, {} as Record<string, PlanDurationTestResult[]>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Plan System Tests</h2>
          <p className="text-sm text-gray-600 mt-1">
            Validate that plan durations, credentials, and locations are working correctly
          </p>
        </div>
        <div className="flex gap-3">
          {testResults.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                setTestResults([]);
                setLastRunTime(null);
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Clear Results
            </Button>
          )}
          <Button
            onClick={runTests}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <Play size={16} />
            {isRunning ? 'Running Tests...' : 'Run Tests'}
          </Button>
        </div>
      </div>

      {lastRunTime && (
        <Card className="p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Last run: {lastRunTime.toLocaleString()}
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-600" size={16} />
                <span className="text-sm font-medium text-green-600">{stats.passed} Passed</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="text-red-600" size={16} />
                <span className="text-sm font-medium text-red-600">{stats.failed} Failed</span>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                stats.passRate === 100 ? 'bg-green-100 text-green-700' :
                stats.passRate >= 80 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {stats.passRate}% Pass Rate
              </div>
            </div>
          </div>
        </Card>
      )}

      {testResults.length > 0 && (
        <div className="space-y-4">
          {Object.entries(groupedResults).map(([testType, results]) => (
            <Card key={testType} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{testType}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {results.filter(r => r.passed).length}/{results.length} passed
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border ${
                      result.passed 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {result.passed ? (
                        <CheckCircle className="text-green-600 mt-0.5" size={20} />
                      ) : (
                        <XCircle className="text-red-600 mt-0.5" size={20} />
                      )}
                      <div className="flex-1">
                        <p className={`font-medium ${
                          result.passed ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {result.message}
                        </p>
                        {!result.passed && result.details && (
                          <div className="mt-2 p-3 bg-white rounded border border-gray-200">
                            <p className="text-xs font-mono text-gray-700">
                              {JSON.stringify(result.details, null, 2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {testResults.length === 0 && !isRunning && (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-gray-400" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Test Results</h3>
          <p className="text-gray-600 mb-6">
            Click "Run Tests" to validate your plan system configuration
          </p>
          <div className="max-w-md mx-auto text-left space-y-2">
            <p className="text-sm text-gray-600">Tests will validate:</p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• Plan duration hours match plan types</li>
              <li>• Duration descriptions are consistent</li>
              <li>• Transaction expiry dates are calculated correctly</li>
              <li>• Custom plans don't conflict with standard plans</li>
              <li>• Plans are available across locations</li>
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
};