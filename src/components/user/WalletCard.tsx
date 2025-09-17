import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { CreditCard, TrendingUp } from 'lucide-react';

interface WalletCardProps {
  onTopUpClick?: () => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({ onTopUpClick }) => {
  const { user, authUser } = useAuth();

  // Show skeleton while user data is loading
  if (!user && authUser) {
    return (
      <div className="relative bg-white rounded-3xl shadow-2xl mb-6 overflow-hidden border border-gray-100 animate-pulse">
        {/* Header skeleton */}
        <div className="bg-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-300 rounded-2xl"></div>
              <div>
                <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-32"></div>
              </div>
            </div>
            <div className="w-8 h-8 bg-gray-300 rounded-lg"></div>
          </div>
        </div>
        
        {/* Balance section skeleton */}
        <div className="px-6 py-8 bg-gray-50">
          <div className="flex flex-col min-[400px]:flex-row items-start min-[400px]:items-center justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
              <div className="h-12 bg-gray-200 rounded w-48 mb-3"></div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
            <div className="w-full min-[400px]:w-32 h-12 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show anything if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="relative bg-white rounded-3xl shadow-2xl mb-6 overflow-hidden border border-gray-100">
      {/* Premium gradient header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              <CreditCard className="text-white" size={20} />
            </div>
            <div>
              <p className="text-white/70 text-sm font-medium">Wallet Balance</p>
              <p className="text-white text-xs font-medium tracking-wider uppercase">STARLINE NETWORKS</p>
            </div>
          </div>
          <div className="text-right">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Balance section */}
      <div className="px-4 sm:px-6 py-6 sm:py-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="flex flex-col min-[400px]:flex-row items-start min-[400px]:items-center justify-between gap-4 sm:gap-6">
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <p className="text-gray-600 text-sm font-medium mb-1">Available Balance</p>
              <p className="text-3xl min-[375px]:text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight break-all">
                ₦{user?.walletBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Account Active</span>
            </div>
          </div>

          <div className="w-full min-[400px]:w-auto">
            <Button
              onClick={onTopUpClick}
              variant="secondary"
              className="w-full min-[400px]:w-auto !bg-gradient-to-r !from-green-600 !to-green-700 hover:!from-green-700 hover:!to-green-800 !text-white !border-0 font-semibold px-6 sm:px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 text-sm sm:text-base"
            >
              <TrendingUp className="mr-2" size={16} />
              <span>Add Funds</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-full blur-2xl"></div>
    </div>
  );
};