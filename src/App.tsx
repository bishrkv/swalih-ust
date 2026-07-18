import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  ArrowRightLeft,
  DollarSign,
  TrendingDown,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  Moon,
  Sun,
  Search,
  X,
  UserCheck,
  Coins,
  Shield,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types and Firestore Client
import { ActiveTab, Member, MonthlyCollection as ColType, Loan, LoanRepayment, Income, Expense } from './types';
import {
  subscribeMembers,
  subscribeCollections,
  subscribeLoans,
  subscribeRepayments,
  subscribeIncome,
  subscribeExpense
} from './firebase';

// Subcomponents
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Members from './components/Members';
import MemberProfile from './components/MemberProfile';
import MonthlyCollection from './components/MonthlyCollection';
import Loans from './components/Loans';
import IncomeExpense from './components/IncomeExpense';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Notification, { ToastMessage } from './components/Notification';

export default function App() {
  // Authentication state (Check session storage for persistence on refresh)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('usba_auth') === 'true';
  });

  // Navigation Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedProfileNo, setSelectedProfileNo] = useState<string>('');

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('usba_dark_mode');
    return savedMode === 'true';
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Database Data States
  const [members, setMembers] = useState<Member[]>([]);
  const [collections, setCollections] = useState<ColType[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [expense, setExpense] = useState<Expense[]>([]);

  // For forcing manual sync refetches if needed
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Apply dark mode on mount or state change
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('usba_dark_mode', darkMode.toString());
  }, [darkMode]);

  // Firestore Real-Time Subscriptions
  useEffect(() => {
    if (!isLoggedIn) return;

    // Subscribe to all tables
    const unsubMembers = subscribeMembers((data) => setMembers(data));
    const unsubCollections = subscribeCollections((data) => setCollections(data));
    const unsubLoans = subscribeLoans((data) => setLoans(data));
    const unsubRepayments = subscribeRepayments((data) => setRepayments(data));
    const unsubIncome = subscribeIncome((data) => setIncome(data));
    const unsubExpense = subscribeExpense((data) => setExpense(data));

    return () => {
      unsubMembers();
      unsubCollections();
      unsubLoans();
      unsubRepayments();
      unsubIncome();
      unsubExpense();
    };
  }, [isLoggedIn, refreshTrigger]);

  // Handle Login success
  const handleLoginSuccess = () => {
    sessionStorage.setItem('usba_auth', 'true');
    setIsLoggedIn(true);
    addToast('Welcome swalih! Access granted.', 'success');
  };

  // Handle Logout
  const handleLogout = () => {
    sessionStorage.removeItem('usba_auth');
    setIsLoggedIn(false);
  };

  // Add Toast helper
  const addToast = (text: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Navigate utility helper
  const handleNavigate = (tab: ActiveTab, memberNo?: string) => {
    setActiveTab(tab);
    if (memberNo) {
      setSelectedProfileNo(memberNo);
    }
  };

  // Trigger data reload helper
  const triggerDatabaseRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // ---------------- GLOBAL SEARCH SYSTEM ----------------
  const [globalQuery, setGlobalQuery] = useState('');
  const [showGlobalResults, setShowGlobalResults] = useState(false);

  // Search through collections/members/loans in parallel
  const searchResults = useMemo(() => {
    if (!globalQuery.trim() || globalQuery.trim().length < 2) return null;

    const q = globalQuery.toLowerCase();
    const matches: {
      members: Member[];
      collections: ColType[];
      loans: Loan[];
    } = {
      members: [],
      collections: [],
      loans: []
    };

    // 1. Members matching Name or Phone
    matches.members = members.filter(
      (m) =>
        m.memberName.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q) ||
        m.memberNo.toLowerCase().includes(q)
    );

    // 2. Collections matching Name, month, or amount
    matches.collections = collections.filter(
      (c) =>
        c.memberName.toLowerCase().includes(q) ||
        c.month.toLowerCase().includes(q) ||
        c.amount.toString().includes(q) ||
        c.year.toLowerCase().includes(q)
    );

    // 3. Loans matching Name, reason, notes, or amount
    matches.loans = loans.filter(
      (l) =>
        l.memberName.toLowerCase().includes(q) ||
        l.reason.toLowerCase().includes(q) ||
        l.amount.toString().includes(q) ||
        (l.notes && l.notes.toLowerCase().includes(q))
    );

    const totalCount = matches.members.length + matches.collections.length + matches.loans.length;
    return totalCount > 0 ? matches : null;
  }, [globalQuery, members, collections, loans]);

  // Auth Guard
  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col lg:grid lg:grid-cols-12 text-zinc-800 dark:text-zinc-100 transition-colors">
      
      {/* Sidebar Panel Navigation */}
      <Sidebar
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode(!darkMode)}
      />

      {/* Main Container Workspace */}
      <main className="lg:col-span-9 min-h-screen flex flex-col p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Global Search Top Bar Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/60 pb-5 print:hidden">
          <div className="relative flex-1 max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Global Search (Name, Phone, Month, Amount, Loan...)"
              value={globalQuery}
              onChange={(e) => {
                setGlobalQuery(e.target.value);
                setShowGlobalResults(true);
              }}
              onFocus={() => setShowGlobalResults(true)}
              className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs text-xs font-semibold"
              id="global-search-input"
            />
            {globalQuery && (
              <button
                onClick={() => {
                  setGlobalQuery('');
                  setShowGlobalResults(false);
                }}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                id="clear-global-search"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Global Search Popover Pop Results */}
            <AnimatePresence>
              {showGlobalResults && searchResults && (
                <>
                  <div
                    onClick={() => setShowGlobalResults(false)}
                    className="fixed inset-0 z-30"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-12 left-0 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-40 max-h-[400px] overflow-y-auto p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                        Search Matches
                      </span>
                      <button
                        onClick={() => setShowGlobalResults(false)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Member matches */}
                    {searchResults.members.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                          <Users className="w-3 h-3" /> Members
                        </h4>
                        <div className="divide-y divide-zinc-50 dark:divide-zinc-800/40">
                          {searchResults.members.map((m) => (
                            <button
                              key={m.memberNo}
                              onClick={() => {
                                handleNavigate('profile', m.memberNo);
                                setGlobalQuery('');
                                setShowGlobalResults(false);
                              }}
                              className="w-full text-left py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 px-2 rounded-lg text-xs flex justify-between font-bold"
                            >
                              <span className="text-zinc-800 dark:text-zinc-200">{m.memberName}</span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-mono">No. {m.memberNo}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Collection matches */}
                    {searchResults.collections.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                          <Coins className="w-3 h-3" /> Monthly Collections
                        </h4>
                        <div className="divide-y divide-zinc-50 dark:divide-zinc-800/40">
                          {searchResults.collections.map((c, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                handleNavigate('collection');
                                setGlobalQuery('');
                                setShowGlobalResults(false);
                              }}
                              className="w-full text-left py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 px-2 rounded-lg text-xs flex justify-between font-bold"
                            >
                              <span className="text-zinc-800 dark:text-zinc-200">
                                {c.memberName} ({c.month} {c.year})
                              </span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                                ₹{c.amount}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Loan matches */}
                    {searchResults.loans.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                          <ArrowRightLeft className="w-3 h-3" /> Loans Disbursed
                        </h4>
                        <div className="divide-y divide-zinc-50 dark:divide-zinc-800/40">
                          {searchResults.loans.map((l) => (
                            <button
                              key={l.id}
                              onClick={() => {
                                handleNavigate('loans');
                                setGlobalQuery('');
                                setShowGlobalResults(false);
                              }}
                              className="w-full text-left py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 px-2 rounded-lg text-xs flex justify-between font-bold"
                            >
                              <span className="text-zinc-800 dark:text-zinc-200">
                                {l.memberName} - {l.reason}
                              </span>
                              <span className="text-rose-600 dark:text-rose-400 font-mono">
                                ₹{l.amount}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* System Security Label */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-[10px] font-extrabold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            Row Level Security (RLS) Active
          </div>
        </header>

        {/* Render Tab Workspace */}
        <div className="flex-1">
          {activeTab === 'dashboard' && (
            <Dashboard
              members={members}
              collections={collections}
              loans={loans}
              repayments={repayments}
              income={income}
              expense={expense}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'members' && (
            <Members members={members} onNavigate={handleNavigate} addToast={addToast} />
          )}

          {activeTab === 'profile' && (
            <MemberProfile
              memberNo={selectedProfileNo}
              members={members}
              collections={collections}
              loans={loans}
              repayments={repayments}
              onBack={() => handleNavigate('members')}
            />
          )}

          {activeTab === 'collection' && (
            <MonthlyCollection members={members} collections={collections} addToast={addToast} />
          )}

          {activeTab === 'loans' && (
            <Loans
              members={members}
              loans={loans}
              repayments={repayments}
              addToast={addToast}
            />
          )}

          {activeTab === 'income' && (
            <IncomeExpense income={income} expense={expense} addToast={addToast} />
          )}

          {activeTab === 'expense' && (
            <IncomeExpense income={income} expense={expense} addToast={addToast} />
          )}

          {activeTab === 'reports' && (
            <Reports
              members={members}
              collections={collections}
              loans={loans}
              repayments={repayments}
              income={income}
              expense={expense}
            />
          )}

          {activeTab === 'settings' && (
            <Settings
              members={members}
              collections={collections}
              loans={loans}
              repayments={repayments}
              income={income}
              expense={expense}
              addToast={addToast}
              triggerDatabaseRefresh={triggerDatabaseRefresh}
            />
          )}
        </div>
      </main>

      {/* Global Real-time Toaster notifications */}
      <Notification toasts={toasts} onClose={removeToast} />
    </div>
  );
}
