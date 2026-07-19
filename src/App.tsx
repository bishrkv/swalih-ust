import React, { useState, useEffect, useMemo } from 'react';
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
  X,
  UserCheck,
  Coins,
  Shield,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types and Firestore Client
import { ActiveTab, Member, MonthlyCollection as ColType, Loan, LoanRepayment, Income, Expense, Drawing, F5WCollection } from './types';
import {
  subscribeMembers,
  subscribeCollections,
  subscribeLoans,
  subscribeRepayments,
  subscribeIncome,
  subscribeExpense,
  subscribeDrawings,
  subscribeF5W
} from './firebase';

// Subcomponents
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Members from './components/Members';
import MemberProfile from './components/MemberProfile';
import MonthlyCollection from './components/MonthlyCollection';
import GivenAmount from './components/GivenAmount';
import Loans from './components/Loans';
import Drawings from './components/Drawings';
import F5W from './components/F5W';
import Reports from './components/Reports';
import GrandTotal from './components/GrandTotal';
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
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [f5wData, setF5WData] = useState<F5WCollection[]>([]);

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
    const unsubMembers = subscribeMembers((data) => {
      const sorted = [...data].sort((a, b) => {
        const numA = parseInt(a.memberNo, 10);
        const numB = parseInt(b.memberNo, 10);
        const isNumA = !isNaN(numA) && /^\d+$/.test(a.memberNo.trim());
        const isNumB = !isNaN(numB) && /^\d+$/.test(b.memberNo.trim());

        if (isNumA && isNumB) {
          return numA - numB;
        }
        if (isNumA) return -1;
        if (isNumB) return 1;

        return a.memberNo.trim().localeCompare(b.memberNo.trim(), undefined, { numeric: true, sensitivity: 'base' });
      });
      setMembers(sorted);
    });
    const unsubCollections = subscribeCollections((data) => setCollections(data));
    const unsubLoans = subscribeLoans((data) => setLoans(data));
    const unsubRepayments = subscribeRepayments((data) => setRepayments(data));
    const unsubIncome = subscribeIncome((data) => setIncome(data));
    const unsubExpense = subscribeExpense((data) => setExpense(data));
    const unsubDrawings = subscribeDrawings((data) => setDrawings(data));
    const unsubF5W = subscribeF5W((data) => setF5WData(data));

    return () => {
      unsubMembers();
      unsubCollections();
      unsubLoans();
      unsubRepayments();
      unsubIncome();
      unsubExpense();
      unsubDrawings();
      unsubF5W();
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
        <header className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 border-b border-zinc-100 dark:border-zinc-800/60 pb-5 print:hidden">
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
              drawings={drawings}
              f5wData={f5wData}
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

          {activeTab === 'f5w' && (
            <F5W members={members} f5wData={f5wData} addToast={addToast} />
          )}

          {activeTab === 'given' && (
            <GivenAmount
              members={members}
              loans={loans}
              addToast={addToast}
            />
          )}

          {activeTab === 'loans' && (
            <Loans
              members={members}
              loans={loans}
              repayments={repayments}
              addToast={addToast}
            />
          )}

          {activeTab === 'drawings' && (
            <Drawings
              drawings={drawings}
              addToast={addToast}
            />
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

          {activeTab === 'grand-total' && (
            <GrandTotal
              members={members}
              collections={collections}
              f5wData={f5wData}
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
