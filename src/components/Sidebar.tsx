import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  ArrowRightLeft,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Building2,
  History,
  Wallet,
  Coins,
  Calculator
} from 'lucide-react';
import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  onLogout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export default function Sidebar({
  activeTab,
  onNavigate,
  onLogout,
  darkMode,
  toggleDarkMode
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'members' as const, label: 'Members', icon: Users },
    { id: 'collection' as const, label: 'Monthly Collection', icon: CheckSquare },
    { id: 'f5w' as const, label: 'F5W Ledger', icon: Coins },
    { id: 'given' as const, label: 'Given Amount', icon: ArrowRightLeft },
    { id: 'loans' as const, label: 'Loans', icon: History },
    { id: 'drawings' as const, label: 'Drawings', icon: Wallet },
    { id: 'reports' as const, label: 'Reports', icon: FileText },
    { id: 'grand-total' as const, label: 'Grand Total', icon: Calculator },
    { id: 'settings' as const, label: 'Backup & Settings', icon: SettingsIcon }
  ];

  const handleNav = (tab: ActiveTab) => {
    onNavigate(tab);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden bg-emerald-800 text-white px-5 py-4 flex items-center justify-between border-b border-emerald-700 shadow-sm print:hidden">
        <div className="flex items-center gap-2.5">
          <Building2 className="w-6 h-6 shrink-0 text-white" />
          <span className="font-extrabold tracking-wide text-sm font-sans uppercase">USBA Fund</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDarkMode}
            className="p-1.5 hover:bg-emerald-700 rounded-lg text-emerald-100 transition-colors"
            id="mobile-darkmode-toggle"
          >
            {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 hover:bg-emerald-700 rounded-lg text-white transition-colors"
            id="mobile-menu-toggle"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Backdrop for Mobile Drawer */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-xs print:hidden"
        />
      )}

      {/* Sidebar Navigation Panel */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-zinc-900 dark:bg-zinc-950 text-zinc-100 flex flex-col justify-between z-50 transform lg:transform-none transition-transform duration-300 border-r border-zinc-800 lg:col-span-3 shrink-0 print:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col">
          {/* Main Logo & Islamic Accent Branding */}
          <div className="p-6 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white border-b border-zinc-800 flex items-center gap-3 relative">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/25">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-wider font-sans uppercase">USBA</h2>
              <p className="text-[10px] text-emerald-100 font-mono tracking-widest uppercase">Marriage Fund</p>
            </div>
            {/* Islamic visual divider line */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-400"></div>
          </div>

          {/* Nav Items List */}
          <nav className="p-4 space-y-1.5 mt-4 flex-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.id === 'members' && activeTab === 'profile');
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 text-xs font-bold rounded-xl transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-900/30 font-extrabold'
                      : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-100'
                  }`}
                  id={`sidebar-item-${item.id}`}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Controls (Dark mode, user info, logout) */}
        <div className="p-4 border-t border-zinc-800 space-y-4">
          {/* System Admin Label */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-emerald-800/50 flex items-center justify-center font-bold font-mono text-xs text-emerald-400">
              S
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-200 leading-none">swalih</p>
              <p className="text-[10px] text-zinc-500 font-mono mt-1">Administrator</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2.5">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="flex-1 py-2 bg-zinc-800/40 hover:bg-zinc-800 hover:text-zinc-100 rounded-xl text-zinc-400 transition-all flex items-center justify-center gap-2 text-xs font-bold border border-zinc-800 cursor-pointer"
              id="sidebar-darkmode-toggle"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
              {darkMode ? 'Light' : 'Dark'}
            </button>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="flex-1 py-2 bg-zinc-800/40 hover:bg-rose-950/20 hover:text-rose-400 rounded-xl text-zinc-400 border border-zinc-800 hover:border-rose-900/40 transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer"
              id="sidebar-logout-btn"
            >
              <LogOut className="w-4 h-4" />
              Exit
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
