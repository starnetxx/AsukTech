import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useData } from '../../contexts/DataContext';
import { Purchase } from '../../types';
import { Calendar, DollarSign, Filter, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { supabase } from '../../utils/supabase';

export const TransactionsView: React.FC = () => {
  const { getAllPurchases, plans, locations } = useData();
  const [fundings, setFundings] = useState<any[]>([]);
  const [filterLocation, setFilterLocation] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterTimeRange, setFilterTimeRange] = useState<'all' | 'hour' | 'day' | 'week' | 'month'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'used' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const allPurchases = getAllPurchases();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('transactions')
        .select('id, user_id, amount, status, reference, details, created_at')
        .eq('type', 'wallet_funding')
        .order('created_at', { ascending: false });
      // Removed limit to fetch all wallet funding records
      setFundings(data || []);
    })();
  }, []);
  
  const filteredPurchases = allPurchases.filter(purchase => {
    // Location filter
    const locationMatch = !filterLocation || purchase.locationId === filterLocation;
    
    // Date filter
    const dateMatch = !filterDate || purchase.purchaseDate.startsWith(filterDate);
    
    // Time range filter
    let timeRangeMatch = true;
    if (filterTimeRange !== 'all') {
      const purchaseTime = new Date(purchase.purchaseDate).getTime();
      const now = Date.now();
      const ranges = {
        'hour': 60 * 60 * 1000,
        'day': 24 * 60 * 60 * 1000,
        'week': 7 * 24 * 60 * 60 * 1000,
        'month': 30 * 24 * 60 * 60 * 1000
      };
      timeRangeMatch = (now - purchaseTime) <= ranges[filterTimeRange];
    }
    
    // Status filter
    const statusMatch = filterStatus === 'all' || purchase.status === filterStatus;
    
    // Search filter (search in user ID, plan name, location name)
    let searchMatch = true;
    if (searchTerm) {
      const plan = plans.find(p => p.id === purchase.planId);
      const location = locations.find(l => l.id === purchase.locationId);
      const searchLower = searchTerm.toLowerCase();
      searchMatch = 
        purchase.userId.toLowerCase().includes(searchLower) ||
        (plan?.name?.toLowerCase().includes(searchLower) || false) ||
        (location?.name?.toLowerCase().includes(searchLower) || false);
    }
    
    return locationMatch && dateMatch && timeRangeMatch && statusMatch && searchMatch;
  });

  const totalRevenue = filteredPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);

  const now = new Date();
  const hourlyWindow = new Date(now.getTime() - 60 * 60 * 1000);
  const dailyWindow = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weeklyWindow = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthlyWindow = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const salesStats = useMemo(() => {
    const sumInRange = (start: Date) => filteredPurchases
      .filter(p => new Date(p.purchaseDate) >= start)
      .reduce((s, p) => s + p.amount, 0);
    return {
      lastHour: sumInRange(hourlyWindow),
      lastDay: sumInRange(dailyWindow),
      lastWeek: sumInRange(weeklyWindow),
      lastMonth: sumInRange(monthlyWindow),
    };
  }, [filteredPurchases]);

  // Enhanced Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPagePurchases = filteredPurchases.slice(startIndex, endIndex);

  const resetPagination = () => setCurrentPage(1);
  
  // Calculate page numbers to display
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  };
  
  // Export functionality
  const exportToCSV = () => {
    const headers = ['Date', 'User ID', 'Plan', 'Location', 'Amount', 'Status'];
    const rows = filteredPurchases.map(purchase => {
      const plan = plans.find(p => p.id === purchase.planId);
      const location = locations.find(l => l.id === purchase.locationId);
      return [
        new Date(purchase.purchaseDate).toLocaleDateString(),
        purchase.userId.slice(0, 8),
        plan?.name || 'Unknown',
        location?.name || 'Unknown',
        purchase.amount.toFixed(2),
        purchase.status
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Transactions & Analytics</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
          <div className="flex items-center gap-2">
            <Filter size={16} />
            <span className="text-sm text-gray-600">
              {filteredPurchases.length} transactions
            </span>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <DollarSign className="text-green-600" size={24} />
              <div>
                <p className="text-sm text-green-700">Total Revenue</p>
                <p className="text-2xl font-bold text-green-900">₦{totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Calendar className="text-blue-600" size={24} />
              <div>
                <p className="text-sm text-blue-700">Transactions</p>
                <p className="text-2xl font-bold text-blue-900">{filteredPurchases.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <DollarSign className="text-purple-600" size={24} />
              <div>
                <p className="text-sm text-purple-700">Average Order</p>
                <p className="text-2xl font-bold text-purple-900">
                  ₦{filteredPurchases.length > 0 ? (totalRevenue / filteredPurchases.length).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Wallet Fundings (includes Admin deposits) */}
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-3">Recent Wallet Fundings</h3>
          {fundings.length === 0 ? (
            <div className="text-sm text-gray-500">No wallet funding records</div>
          ) : (
            <div className="space-y-2">
              {fundings.map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="text-sm text-gray-700">
                    <div>
                      <span className="font-medium">User:</span> {String(f.user_id).slice(0,8)}...
                    </div>
                    <div className="text-xs text-gray-500">{new Date(f.created_at).toLocaleString()}</div>
                    {f.details?.method && (
                      <div className="text-xs text-purple-700">Method: {f.details.method}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-700">₦{Number(f.amount).toLocaleString()}</div>
                    <div className="text-xs text-gray-600 capitalize">{f.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Enhanced Filters */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); resetPagination(); }}
                placeholder="User ID, Plan, Location..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                value={filterLocation}
                onChange={(e) => { setFilterLocation(e.target.value); resetPagination(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Locations</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Time Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Range
              </label>
              <select
                value={filterTimeRange}
                onChange={(e) => { setFilterTimeRange(e.target.value as any); resetPagination(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="hour">Last Hour</option>
                <option value="day">Last 24 Hours</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value as any); resetPagination(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="used">Used</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            
            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specific Date
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => { setFilterDate(e.target.value); resetPagination(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Items per page */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Items per page
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); resetPagination(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
          
          {/* Clear Filters Button */}
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterLocation('');
                setFilterTimeRange('all');
                setFilterStatus('all');
                setFilterDate('');
                resetPagination();
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-xs text-blue-700">Sales (Last Hour)</p>
            <p className="text-lg font-semibold text-blue-900">₦{salesStats.lastHour.toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-xs text-blue-700">Sales (Last 24h)</p>
            <p className="text-lg font-semibold text-blue-900">₦{salesStats.lastDay.toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-xs text-blue-700">Sales (Last 7d)</p>
            <p className="text-lg font-semibold text-blue-900">₦{salesStats.lastWeek.toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-xs text-blue-700">Sales (Last 30d)</p>
            <p className="text-lg font-semibold text-blue-900">₦{salesStats.lastMonth.toFixed(2)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3">Date</th>
                <th className="text-left py-3">User</th>
                <th className="text-left py-3">Plan</th>
                <th className="text-left py-3">Location</th>
                <th className="text-left py-3">Amount</th>
                <th className="text-left py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {currentPagePurchases.map((purchase) => {
                const plan = plans.find(p => p.id === purchase.planId);
                const location = locations.find(l => l.id === purchase.locationId);
                
                return (
                  <tr key={purchase.id} className="border-b">
                    <td className="py-3">
                      {new Date(purchase.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="py-3">{purchase.userId.slice(0, 8)}...</td>
                    <td className="py-3">{plan?.name || 'Unknown'}</td>
                    <td className="py-3">{location?.name || 'Unknown'}</td>
                    <td className="py-3 font-semibold">₦{purchase.amount.toFixed(2)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        purchase.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : purchase.status === 'expired'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {purchase.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredPurchases.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No transactions found for the selected filters.
            </div>
          )}
        </div>

        {/* Enhanced Pagination */}
        {filteredPurchases.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredPurchases.length)} of {filteredPurchases.length} transactions
            </div>
            
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 inline" />
                <ChevronLeft className="w-4 h-4 inline -ml-2" />
              </button>
              
              <button
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 inline" />
                Prev
              </button>
              
              <div className="flex items-center gap-1">
                {getPageNumbers().map((pageNum, idx) => (
                  pageNum === '...' ? (
                    <span key={`dots-${idx}`} className="px-2 py-1 text-gray-400">...</span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(Number(pageNum))}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                ))}
              </div>
              
              <button
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 inline" />
              </button>
              
              <button
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4 inline -mr-2" />
                <ChevronRight className="w-4 h-4 inline" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};