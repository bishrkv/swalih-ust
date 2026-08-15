import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Coins,
  MoreHorizontal,
  ArrowRightLeft,
  History,
  Wallet,
  FileText,
  Calculator,
  Settings as SettingsIcon,
  Moon,
  Sun,
  LogOut,
  X,
  Building2,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ActiveTab } from '../types';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  onLogout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export default function MobileBottomNav({
  activeTab,
  onNavigate,
  onLogout,
  darkMode,
  toggleDarkMode
}: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  // 4 Primary quick items on bottom bar + More button
  const primaryTabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'collection' as const, label: 'Collection', icon: CheckSquare },
    { id: 'f5w' as const, label: 'F5W', icon: Coins },
    { id: 'members' as const, label: 'Members', icon: Users }
  ];

  // Secondary items in the "More" slide-up drawer
  const moreItems = [
    { id: 'loans' as const, label: 'Loans Ledger', desc: 'Disbursements & active repayments', icon: History, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
    { id: 'given' as const, label: 'Given Amount', desc: 'Grants & one-time assistance', icon: ArrowRightLeft, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' },
    { id: 'drawings' as const, label: 'Drawings', desc: 'Partner distributions & drawdowns', icon: Wallet, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40' },
    { id: 'reports' as const, label: 'Reports & Export', desc: 'Financial audit sheets & balance', icon: FileText, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
    { id: 'grand-total' as const, label: 'Grand Total Matrix', desc: 'Multi-year cross aggregations', icon: Calculator, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
    { id: 'settings' as const, label: 'Backup & Settings', desc: 'Database restore & security PIN', icon: SettingsIcon, color: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800' }
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    onNavigate(tab);
    setMoreOpen(false);
  };

  const isMoreActive = moreItems.some((item) => item.id === activeTab);

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800 shadow-lg px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),8px)] print:hidden"
        id="mobile-bottom-nav"
      >
        <div className="grid grid-cols-5 items-center justify-around max-w-md mx-auto">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id || (tab.id === 'members' && activeTab === 'profile');
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
                id={`mobile-tab-${tab.id}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveTabPill"
                    className="absolute -top-1.5 w-6 h-1 bg-emerald-600 dark:bg-emerald-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div className={`p-1 rounded-lg ${isActive ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 leading-none">{tab.label}</span>
              </button>
            );
          })}

          {/* More Menu Trigger */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
              isMoreActive || moreOpen
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
            id="mobile-tab-more"
          >
            {(isMoreActive || moreOpen) && (
              <motion.div
                layoutId="mobileActiveTabPill"
                className="absolute -top-1.5 w-6 h-1 bg-emerald-600 dark:bg-emerald-400 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <div className={`p-1 rounded-lg ${isMoreActive || moreOpen ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''}`}>
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-Up Bottom Sheet Drawer for "More" Menu */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 z-50 backdrop-blur-xs print:hidden"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 rounded-t-3xl border-t border-zinc-200 dark:border-zinc-800 max-h-[85vh] overflow-hidden flex flex-col shadow-2xl pb-[max(env(safe-area-inset-bottom),16px)] print:hidden"
            >
              {/* Sheet Drag Indicator */}
              <div className="pt-3 pb-1 flex justify-center">
                <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
              </div>

              {/* Sheet Header */}
              <div className="px-5 py-3 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">USBA Marriage Fund</h3>
                    <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">Additional Sections</p>
                  </div>
                </div>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Menu Grid / List */}
              <div className="p-4 space-y-2 overflow-y-auto max-h-[50vh]">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center gap-3.5 p-3 rounded-2xl transition-all text-left ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200'
                      }`}
                      id={`mobile-more-item-${item.id}`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${item.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold leading-snug truncate">{item.label}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Actions: Dark Mode & Logout */}
              <div className="px-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-3">
                <button
                  onClick={toggleDarkMode}
                  className="py-2.5 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  id="mobile-sheet-darkmode"
                >
                  {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
                  {darkMode ? 'Light Theme' : 'Dark Theme'}
                </button>

                <button
                  onClick={onLogout}
                  className="py-2.5 px-4 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  id="mobile-sheet-logout"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
