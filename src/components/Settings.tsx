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
  ShieldAlert,
  Trash2
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
  saveExpense,
  clearAllMembersAndData
} from '../firebase';
import ConfirmModal from './ConfirmModal';

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

  // Danger Zone Clear Data State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAllData = async () => {
    setIsConfirmOpen(false);
    setIsClearing(true);
    addToast('Clearing database records...', 'info');
    try {
      await clearAllMembersAndData();
      addToast('All members and their data have been completely removed.', 'success');
      triggerDatabaseRefresh();
    } catch (err) {
      console.error(err);
      addToast('Failed to clear database records: ' + (err as Error).message, 'error');
    } finally {
      setIsClearing(false);
    }
  };

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

  // Seeding State
  const [isSeeding, setIsSeeding] = useState(false);

  // Seed Historical OCR Ledger Data (2025-2029)
  const handleSeedHistoricalData = async () => {
    setIsSeeding(true);
    addToast('Seeding 4 years of Marriage Fund ledger records...', 'info');
    try {
      // 1. Members
      const seedMembers: Member[] = [
        { id: "1", memberNo: "1", memberName: "Swalih K. V.", phone: "+91 9845123456", address: "Kozhikode, Kerala", status: "Active", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 365 },
        { id: "2", memberNo: "2", memberName: "Bishr K. V.", phone: "+91 9744112233", address: "Malappuram, Kerala", status: "Active", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 365 },
        { id: "3", memberNo: "3", memberName: "Muhammad Abdul Rahman", phone: "+91 9020334455", address: "Kannur, Kerala", status: "Active", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 365 },
        { id: "4", memberNo: "4", memberName: "Faisal Ahmed", phone: "+91 8086223344", address: "Kozhikode, Kerala", status: "Active", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 365 },
        { id: "5", memberNo: "5", memberName: "Anas K.", phone: "+91 9544556677", address: "Wayanad, Kerala", status: "Active", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 365 },
        { id: "6", memberNo: "6", memberName: "Ibrahim Kutty", phone: "+91 9946889900", address: "Malappuram, Kerala", status: "Active", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 365 },
        { id: "7", memberNo: "7", memberName: "Shameer V. P.", phone: "+91 9895001122", address: "Kozhikode, Kerala", status: "Active", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 365 },
        { id: "8", memberNo: "8", memberName: "Jasim Hassan", phone: "+91 9747223344", address: "Palakkad, Kerala", status: "Active", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 365 },
        { id: "9", memberNo: "9", memberName: "Noufal Rahman", phone: "+91 9447112233", address: "Thrissur, Kerala", status: "Active", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 365 },
        { id: "10", memberNo: "10", memberName: "Abdul Latheef", phone: "+91 9846334455", address: "Ernakulam, Kerala", status: "Active", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 365 },
        { id: "11", memberNo: "11", memberName: "Rishad T. P.", phone: "+91 9048556677", address: "Malappuram, Kerala", status: "Active", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 365 },
        { id: "12", memberNo: "12", memberName: "Ashique Ali", phone: "+91 9745112233", address: "Kozhikode, Kerala", status: "Inactive", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 365 }
      ];

      for (const m of seedMembers) {
        await saveMember(m);
      }

      // 2. Collections
      const months = [
        'May', 'June', 'July', 'August', 'September', 'October',
        'November', 'December', 'January', 'February', 'March', 'April'
      ];

      // Seed 2025-2026
      for (const m of seedMembers) {
        if (m.memberNo === "12") {
          for (let i = 0; i < 6; i++) {
            const col: MonthlyCollection = {
              id: `${m.memberNo}_2025-2026_${months[i]}`,
              memberNo: m.memberNo,
              memberName: m.memberName,
              year: '2025-2026',
              month: months[i],
              amount: 500,
              status: 'Paid',
              remarks: 'Early collection',
              paymentMode: 'Cash',
              updatedAt: Date.now()
            };
            await saveMonthlyCollection(col);
          }
        } else {
          const pmMode = ["1", "2", "3"].includes(m.memberNo) ? "Google Pay" : "Cash";
          for (const month of months) {
            const col: MonthlyCollection = {
              id: `${m.memberNo}_2025-2026_${month}`,
              memberNo: m.memberNo,
              memberName: m.memberName,
              year: '2025-2026',
              month: month,
              amount: 500,
              status: 'Paid',
              remarks: 'On time',
              paymentMode: pmMode,
              updatedAt: Date.now()
            };
            await saveMonthlyCollection(col);
          }
        }
      }

      // Seed 2026-2027 (May, June, July)
      for (const m of seedMembers) {
        if (m.memberNo === "12") continue;
        const pmMode = ["1", "2", "3"].includes(m.memberNo) ? "Google Pay" : "Cash";
        
        await saveMonthlyCollection({
          id: `${m.memberNo}_2026-2027_May`,
          memberNo: m.memberNo,
          memberName: m.memberName,
          year: '2026-2027',
          month: 'May',
          amount: 500,
          status: 'Paid',
          remarks: 'Paid',
          paymentMode: pmMode,
          updatedAt: Date.now()
        });

        await saveMonthlyCollection({
          id: `${m.memberNo}_2026-2027_June`,
          memberNo: m.memberNo,
          memberName: m.memberName,
          year: '2026-2027',
          month: 'June',
          amount: 500,
          status: 'Paid',
          remarks: 'Paid',
          paymentMode: pmMode,
          updatedAt: Date.now()
        });

        const isPaid = parseInt(m.memberNo, 10) <= 7;
        await saveMonthlyCollection({
          id: `${m.memberNo}_2026-2027_July`,
          memberNo: m.memberNo,
          memberName: m.memberName,
          year: '2026-2027',
          month: 'July',
          amount: 500,
          status: isPaid ? 'Paid' : 'Pending',
          remarks: isPaid ? 'Paid' : 'Awaiting payment',
          paymentMode: pmMode,
          updatedAt: Date.now()
        });
      }

      // 3. Loans
      const seedLoans: Loan[] = [
        {
          id: "seed_loan_1",
          memberNo: "3",
          memberName: "Muhammad Abdul Rahman",
          amount: 10000,
          date: "2025-06-15",
          paymentMode: "Cash",
          reason: "Sister's marriage help",
          notes: "Repayment starting Sept 2025",
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 300
        },
        {
          id: "seed_loan_2",
          memberNo: "6",
          memberName: "Ibrahim Kutty",
          amount: 15000,
          date: "2025-11-10",
          paymentMode: "Google Pay",
          reason: "Daughter marriage expenses",
          notes: "Approved in general body meeting",
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 200
        }
      ];
      for (const l of seedLoans) {
        await saveLoan(l);
      }

      // 4. Repayments
      const seedRepayments: LoanRepayment[] = [
        {
          id: "seed_rep_1",
          loanId: "seed_loan_1",
          memberNo: "3",
          memberName: "Muhammad Abdul Rahman",
          amount: 2000,
          date: "2025-09-05",
          paymentMode: "Cash",
          notes: "1st installment",
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 250
        },
        {
          id: "seed_rep_2",
          loanId: "seed_loan_1",
          memberNo: "3",
          memberName: "Muhammad Abdul Rahman",
          amount: 3000,
          date: "2025-11-02",
          paymentMode: "Cash",
          notes: "2nd installment",
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 210
        },
        {
          id: "seed_rep_3",
          loanId: "seed_loan_2",
          memberNo: "6",
          memberName: "Ibrahim Kutty",
          amount: 5000,
          date: "2026-02-15",
          paymentMode: "Google Pay",
          notes: "Part payment",
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 120
        },
        {
          id: "seed_rep_4",
          loanId: "seed_loan_1",
          memberNo: "3",
          memberName: "Muhammad Abdul Rahman",
          amount: 1000,
          date: "2026-04-10",
          paymentMode: "Cash",
          notes: "3rd installment",
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 80
        }
      ];
      for (const r of seedRepayments) {
        await saveRepayment(r);
      }

      // 5. Incomes
      const seedIncomes: Income[] = [
        {
          id: "seed_inc_1",
          category: "Donation",
          amount: 2500,
          date: "2025-07-20",
          paymentMode: "Cash",
          description: "Donation from well-wisher bishr",
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 280
        },
        {
          id: "seed_inc_2",
          category: "Bank Interest",
          amount: 1500,
          date: "2026-03-31",
          paymentMode: "Google Pay",
          description: "Savings account interest",
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 100
        }
      ];
      for (const i of seedIncomes) {
        await saveIncome(i);
      }

      // 6. Expenses
      const seedExpenses: Expense[] = [
        {
          id: "seed_exp_1",
          category: "Auditing",
          amount: 1500,
          date: "2026-04-12",
          paymentMode: "Google Pay",
          description: "Professional auditor fees",
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 78
        },
        {
          id: "seed_exp_2",
          category: "Stationery",
          amount: 1000,
          date: "2025-05-10",
          paymentMode: "Cash",
          description: "Purchase of physical registry books",
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 340
        }
      ];
      for (const e of seedExpenses) {
        await saveExpense(e);
      }

      addToast('Successfully seeded marriage fund ledger with 4 years of historical OCR data!', 'success');
      triggerDatabaseRefresh();
    } catch (err) {
      console.error(err);
      addToast('Failed to seed historical data: ' + (err as Error).message, 'error');
    } finally {
      setIsSeeding(false);
    }
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

            {/* Seed Historical OCR Ledger Data */}
            <button
              onClick={handleSeedHistoricalData}
              disabled={isSeeding}
              className="px-4 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              id="settings-seed-demo-data-btn"
            >
              <RefreshCw className={`w-4 h-4 ${isSeeding ? 'animate-spin' : ''}`} />
              {isSeeding ? 'Seeding Ledger...' : 'Seed Historical OCR Data (2025-2029)'}
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone Section */}
      <div className="bg-rose-50/30 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/40 p-6 rounded-3xl shadow-sm mt-6">
        <div className="flex items-center gap-2 border-b border-rose-100 dark:border-rose-900/20 pb-3 mb-4">
          <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <h2 className="text-base font-bold text-rose-700 dark:text-rose-400">Danger Zone</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Clear Database & Remove All Members</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-2xl">
              This will permanently delete all registered members, monthly collections, loans, loan repayments, and other transaction records from the website. This action is irreversible.
            </p>
          </div>
          
          <button
            onClick={() => setIsConfirmOpen(true)}
            disabled={isClearing}
            className="px-5 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
            id="settings-clear-all-data-btn"
          >
            <Trash2 className="w-4 h-4" />
            {isClearing ? 'Clearing Data...' : 'Delete All Data'}
          </button>
        </div>
      </div>

      {/* Clear Database Confirm Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Clear All Database Records?"
        message="Are you absolutely sure you want to delete all members, payment collections, loans, repayments, income, and expense records? This operation is permanent and cannot be undone."
        onConfirm={handleClearAllData}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
