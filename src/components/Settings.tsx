import React, { useState, useRef, useEffect } from 'react';
import {
  Lock,
  Download,
  Upload,
  CheckCircle,
  Database,
  RefreshCw,
  Eye,
  EyeOff,
  Settings as SettingsIcon,
  ShieldAlert
} from 'lucide-react';
import { motion } from 'motion/react';
import { Member, MonthlyCollection, Loan, LoanRepayment, Income, Expense } from '../types';
import {
  saveSettings,
  getSettingsPassword,
  saveMember,
  saveMonthlyCollection,
  saveLoan,
  saveRepayment,
  saveIncome,
  saveExpense
} from '../firebase';

interface SettingsProps {
  members: Member[];
  collections: MonthlyCollection[];
  loans: Loan[];
  repayments: LoanRepayment[];
  income: Income[];
  expense: Expense[];
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
  triggerDatabaseRefresh: () => void;
}

export default function Settings({
  members,
  collections,
  loans,
  repayments,
  income,
  expense,
  addToast,
  triggerDatabaseRefresh
}: SettingsProps) {
  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savedPassword, setSavedPassword] = useState('6780');

  // Load Admin Password from DB
  useEffect(() => {
    async function load() {
      try {
        const pass = await getSettingsPassword();
        setSavedPassword(pass);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Change Password Submission
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentPassword !== savedPassword) {
      addToast('Current password does not match.', 'error');
      return;
    }

    if (newPassword.trim().length < 4) {
      addToast('New password must be at least 4 characters long.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match.', 'error');
      return;
    }

    try {
      await saveSettings(newPassword);
      setSavedPassword(newPassword);
      addToast('System password updated successfully', 'success');
      
      // Reset
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      addToast('Failed to save new system password', 'error');
    }
  };

  // One-click Export Backup to JSON
  const handleBackupExport = () => {
    try {
      const backupData = {
        metadata: {
          system: 'USBA Marriage Fund Management System',
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          recordCounts: {
            members: members.length,
            collections: collections.length,
            loans: loans.length,
            repayments: repayments.length,
            income: income.length,
            expense: expense.length
          }
        },
        data: {
          members,
          collections,
          loans,
          repayments,
          income,
          expense
        }
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `USBA_MarriageFund_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      addToast('Database backup compiled and exported successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to compile database backup', 'error');
    }
  };

  // Restore Backup from JSON File
  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const fileContent = event.target?.result as string;
        const backupObj = JSON.parse(fileContent);

        if (!backupObj.data || !backupObj.data.members) {
          addToast('Invalid backup schema. Unable to parse data.', 'error');
          return;
        }

        const data = backupObj.data;
        let restoredCount = 0;

        // Restore Members
        if (Array.isArray(data.members)) {
          for (const m of data.members) {
            await saveMember(m);
            restoredCount++;
          }
        }

        // Restore Collections
        if (Array.isArray(data.collections)) {
          for (const col of data.collections) {
            await saveMonthlyCollection(col);
          }
        }

        // Restore Loans
        if (Array.isArray(data.loans)) {
          for (const l of data.loans) {
            await saveLoan(l);
          }
        }

        // Restore Repayments
        if (Array.isArray(data.repayments)) {
          for (const r of data.repayments) {
            await saveRepayment(r);
          }
        }

        // Restore Income
        if (Array.isArray(data.income)) {
          for (const inc of data.income) {
            await saveIncome(inc);
          }
        }

        // Restore Expense
        if (Array.isArray(data.expense)) {
          for (const exp of data.expense) {
            await saveExpense(exp);
          }
        }

        addToast(`Successfully restored database backup with ${restoredCount} members!`, 'success');
        
        // Trigger parent refresh/sync
        triggerDatabaseRefresh();

        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error(err);
        addToast('Failed to parse backup JSON file. Ensure file is non-corrupt.', 'error');
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <span className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl">
            <SettingsIcon className="w-5 h-5" />
          </span>
          System Settings & Backups
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Configure security credentials, download raw JSON ledger backups, or restore database state files.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Change Password Panel */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm space-y-6">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <Lock className="w-4 h-4 text-emerald-600" />
            Security Password
          </h2>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                  placeholder="Enter current password"
                  id="settings-current-pass"
                />
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                  placeholder="Enter new password"
                  id="settings-new-pass"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                  id="toggle-settings-pass-visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                placeholder="Retype new password"
                id="settings-confirm-pass"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              id="settings-change-password-btn"
            >
              Update Password
            </button>
          </form>
        </div>

        {/* Database Backup & Restore Panel */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <Database className="w-4 h-4 text-emerald-600" />
              Database Backups & Recovery
            </h2>

            <div className="mt-4 p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Full ledger backups allow downloading the entire Google Firestore database as a structural JSON file with one click. Restoring replaces overlapping records and merges active members, collections, loans, and cash transactions.
              </p>
            </div>

            {/* Stats info */}
            <div className="mt-6 grid grid-cols-2 gap-4 text-xs font-semibold text-zinc-400 bg-zinc-50 dark:bg-zinc-800/20 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div>
                <span>Registered Members:</span>
                <span className="block text-sm font-bold text-zinc-800 dark:text-zinc-200 font-mono mt-0.5">{members.length}</span>
              </div>
              <div>
                <span>Payment Records:</span>
                <span className="block text-sm font-bold text-zinc-800 dark:text-zinc-200 font-mono mt-0.5">{collections.length}</span>
              </div>
            </div>
          </div>

          {/* Backup Buttons */}
          <div className="pt-6 flex flex-wrap gap-3">
            {/* Export */}
            <button
              onClick={handleBackupExport}
              className="px-4 py-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              id="settings-download-backup-btn"
            >
              <Download className="w-4 h-4" />
              Download Backup (JSON)
            </button>

            {/* Restore */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleBackupImport}
              accept=".json"
              className="hidden"
              id="settings-restore-file-input"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl font-bold text-xs flex items-center gap-2 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
              id="settings-restore-backup-btn"
            >
              <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Restore Backup File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
