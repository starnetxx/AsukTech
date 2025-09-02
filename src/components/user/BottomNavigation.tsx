import React from 'react';
import { Home, Wifi, Users, Settings } from 'lucide-react';

type ActivePage = 'home' | 'plans' | 'referrals' | 'settings';

interface BottomNavigationProps {
  activePage: ActivePage;
  onPageChange: (page: ActivePage) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activePage,
  onPageChange,
}) => {
  const navItems = [
    { id: 'home' as ActivePage, icon: Home, label: 'Home' },
    { id: 'plans' as ActivePage, icon: Wifi, label: 'Plans' },
    { id: 'referrals' as ActivePage, icon: Users, label: 'Referrals' },
    { id: 'settings' as ActivePage, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-1px_8px_rgba(0,0,0,0.04)]">
      <div className="max-w-md mx-auto px-2 py-2">
        <div className="flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`flex-1 flex flex-col items-center py-2 px-2 rounded-lg transition-colors ${
                  isActive ? 'text-[#4285F4]' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <div className="relative flex items-center justify-center w-10 h-10">
                  <Icon size={22} />
                  {isActive && (
                    <span className="absolute -bottom-1 w-6 h-1 rounded-full bg-[#4285F4]"></span>
                  )}
                </div>
                <span className="text-[10px] min-[360px]:text-xs mt-1 font-semibold">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};