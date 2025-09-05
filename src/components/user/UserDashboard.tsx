import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { WalletCard } from './WalletCard';
import { RecentTransactions } from './RecentTransactions';

import { PlansList } from './PlansList';
import { VirtualAccountPage } from './VirtualAccountPage';
import { BottomNavigation } from './BottomNavigation';
import { ReferralPage } from './ReferralPage';
import { SettingsPage } from './SettingsPage';
import { NotificationBanner } from './NotificationBanner';
import { TransferModal } from './TransferModal';
import { Bell, ChevronDown, LogOut, Eye, EyeOff, Copy, Smartphone, CreditCard, ArrowUpRight, Clock, Send } from 'lucide-react';

type ActivePage = 'home' | 'plans' | 'referrals' | 'settings' | 'virtual-account';

export const UserDashboard: React.FC = () => {
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const { user, refreshSession, logout } = useAuth();
  const { getUserPurchases, refreshData } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isOnline, isSlow } = useNetworkStatus();
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Remove the activation logic - we'll show recent transactions instead

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh both auth session and data
      await Promise.all([
        refreshSession(),
        refreshData()
      ]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderContent = () => {
    switch (activePage) {
      case 'home':
        return (
          <div className="space-y-6">
            <NotificationBanner />

            {/* Wallet Card - Refined banking style */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mx-4 relative border border-gray-100">
              {/* Savings tab notch */}
              <div className="absolute -top-3 left-6 right-6 mx-auto w-28 text-center">
                <div className="inline-block bg-[#4285F4] text-white text-xs font-bold rounded-t-xl rounded-b-lg px-3 py-1 shadow-md">
                  WALLET
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 mt-2">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Available balance</p>
                </div>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title={showBalance ? 'Hide balance' : 'Show balance'}
                >
                  {showBalance ? <Eye size={20} className="text-gray-600" /> : <EyeOff size={20} className="text-gray-600" />}
                </button>
              </div>

              <div className="mb-4">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  {showBalance 
                    ? `₦${(user?.walletBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '₦****.**'}
                </h2>
              </div>

              {user?.virtualAccountNumber ? (
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-gray-600 text-sm">Account number</p>
                    <p className="text-blue-700 font-mono font-semibold tracking-wide">
                      {user.virtualAccountNumber}
                    </p>
                    {user?.virtualAccountBankName && (
                      <p className="text-gray-600 text-xs mt-1">Bank: <span className="font-medium text-gray-800">{user.virtualAccountBankName}</span></p>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(user.virtualAccountNumber as string);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Copy account number"
                    aria-label="Copy account number"
                  >
                    <Copy size={16} className={copied ? 'text-green-600' : 'text-gray-600'} />
                  </button>
                </div>
              ) : (
                <div
                  className="flex items-center justify-between mb-2 rounded-xl bg-amber-50 border border-amber-200 p-4 hover:bg-amber-100 cursor-pointer transition-colors"
                  onClick={() => setActivePage('virtual-account')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePage('virtual-account'); } }}
                  title="Create virtual account"
                  aria-label="Create virtual account"
                >
                  <div className="pr-3">
                    <p className="text-amber-900 text-sm">Create a virtual account to fund your wallet.</p>
                  </div>
                  <div className="text-amber-900 font-semibold flex items-center gap-1">
                    Create
                    <ArrowUpRight size={16} />
                  </div>
                </div>
              )}

              {/* Transfer Button */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowTransferModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#4285F4] hover:bg-[#3367D6] text-white rounded-xl font-semibold transition-colors"
                >
                  <Send size={16} />
                  Transfer Funds
                </button>
              </div>

              {/* Dots indicator */}
              <div className="flex justify-center space-x-2 mt-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              </div>
            </div>

            {/* Quick Actions removed as requested */}

            {/* Upgrade Account - Redesigned */}
            <div className="mx-4">
              <div className="relative overflow-hidden bg-gradient-to-br from-[#4285F4] via-[#3367D6] to-[#1A73E8] rounded-3xl p-6 shadow-xl">
                {/* Background Pattern */}
                <div className="absolute inset-0">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white/5 rounded-full blur-xl"></div>
                </div>
                
                <div className="relative z-10 flex items-center justify-between max-[380px]:flex-col max-[380px]:items-start max-[380px]:gap-3">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/30">
                      <CreditCard size={26} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg mb-1 max-[380px]:text-base">Upgrade Account</h3>
                      <p className="text-white/90 text-sm max-[380px]:text-xs leading-relaxed">
                        Create a virtual account to enjoy <span className="font-semibold">higher limits & faster funding</span>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActivePage('virtual-account')}
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 p-3 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 border border-white/30 shadow-lg max-[380px]:self-stretch max-[380px]:w-full max-[380px]:justify-center"
                  >
                    <ArrowUpRight size={22} className="text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Transactions - Redesigned */}
            <div className="mx-4">
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-5 border-b border-gray-100 max-[380px]:px-4 max-[380px]:py-4">
                  <div className="flex items-center justify-between max-[380px]:flex-col max-[380px]:items-start max-[380px]:gap-2">
                    <div className="flex items-center space-x-3 max-[380px]:space-x-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#4285F4] to-[#1A73E8] rounded-2xl flex items-center justify-center shadow-md max-[380px]:w-9 max-[380px]:h-9">
                        <Clock size={18} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-gray-900 font-bold text-lg max-[380px]:text-base">Recent Transactions</h3>
                        <p className="text-gray-600 text-sm max-[380px]:text-xs">Your latest activity</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActivePage('settings')}
                      className="text-[#4285F4] text-sm font-semibold hover:text-[#3367D6] transition-colors flex items-center space-x-1 max-[380px]:text-xs"
                    >
                      <span>See all</span>
                      <ArrowUpRight size={12} />
                    </button>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6">
            <RecentTransactions onNavigateToHistory={() => setActivePage('settings')} />
                </div>
              </div>
            </div>

            {/* Quick Services - redesigned */}
            <div className="mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Quick Services</h3>
                <button 
                  onClick={() => setActivePage('plans')}
                  className="text-[#4285F4] text-sm font-medium flex items-center gap-1"
                >
                  View all
                  <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Hourly', color: 'bg-[#E3F2FD] text-[#1E88E5]', dot: 'bg-[#1E88E5]' },
                  { label: 'Daily', color: 'bg-[#E8F5E9] text-[#2E7D32]', dot: 'bg-[#2E7D32]' },
                  { label: 'Weekly', color: 'bg-[#FFF3E0] text-[#EF6C00]', dot: 'bg-[#EF6C00]' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setActivePage('plans')}
                    className={`flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100`}
                  >
                    <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center mb-3`}> 
                      <div className={`w-6 h-6 ${item.dot} rounded-full`}></div>
                    </div>
                    <span className="text-gray-800 text-sm font-semibold">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Popular Plans */}
            <div className="mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Popular Plans</h3>
                <div className="text-blue-600 text-sm font-medium bg-blue-50 px-3 py-1 rounded-full">
                  Save up to 20%
                </div>
              </div>
            <PlansList onSeeAllClick={() => setActivePage('plans')} />
            </div>
          </div>
        );
      case 'plans':
        return <PlansList showAll={true} />;
      case 'referrals':
        return <ReferralPage />;
      case 'settings':
        return <SettingsPage />;
      case 'virtual-account':
        return <VirtualAccountPage onBack={() => setActivePage('home')} />;
      default:
        return null;
    }
  };

  // Don't show header and bottom nav for virtual account page
  if (activePage === 'virtual-account') {
    return renderContent();
  }

  return (
    <div className="min-h-screen bg-[#4285F4]">
      <div className="max-w-md mx-auto bg-[#f1f1f1] min-h-screen relative">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#4285F4] via-[#3367D6] to-[#1A73E8] px-3 sm:px-4 pt-8 sm:pt-10 pb-7 sm:pb-8 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-white/10 rounded-b-3xl"></div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl"></div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white rounded-xl flex items-center justify-center shadow-md">
                  <img src="/starline-logo.png" alt="Starline Networks" className="h-7 w-7 sm:h-8 sm:w-8 object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="text-white/90 text-xs">Welcome</span>
                  <span className="text-white font-semibold leading-tight">{user?.email?.split('@')[0] || 'User'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={logout}
                  className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-white text-red-600 rounded-xl sm:rounded-2xl font-semibold shadow-sm border border-red-100 hover:bg-red-50 transition-all duration-200"
                  title="Logout"
                >
                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">Logout</span>
                </button>
              </div>
            </div>
          </div>
          

          {/* Network Status Indicator */}
          {(!isOnline || isSlow) && (
            <div className="mb-4 p-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 relative z-10">
              <div className="flex items-center gap-3 text-white text-sm font-medium">
                {!isOnline ? (
                  <>
                    <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse shadow-lg"></div>
                    <span>You're offline. Some features may not work.</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-lg"></div>
                    <span>Slow connection detected. Please be patient.</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        <main className="pb-40 min-h-[calc(100vh-200px)] max-[380px]:pb-36 max-[360px]:pb-32 max-[350px]:pb-28">
          <div className="px-4 -mt-4 relative">
            <div className="min-h-[calc(100vh-300px)] max-[380px]:min-h-[calc(100vh-280px)] max-[360px]:min-h-[calc(100vh-260px)] max-[350px]:min-h-[calc(100vh-240px)]">
              {renderContent()}
            </div>
          </div>
        </main>
        <BottomNavigation activePage={activePage} onPageChange={setActivePage} />
        
        {/* Transfer Modal */}
        <TransferModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => {
            refreshData();
            refreshSession();
          }}
        />
      </div>
    </div>
  );
};