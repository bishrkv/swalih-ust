import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  User,
  ArrowRightLeft,
  ChevronDown,
  Info,
  CheckCircle,
  Clock,
  History,
  Pencil,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, Loan, LoanRepayment } from '../types';
import { saveLoan, deleteLoan, saveRepayment, deleteRepayment } from '../firebase';
import ConfirmModal from './ConfirmModal';

interface LoansProps {
  members: Member[];
  loans: Loan[];
  repayments: LoanRepayment[];
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function Loans({ members, loans, repayments, addToast }: LoansProps) {
  // Navigation tabs for Loans view
  const [activeSubTab, setActiveSubTab] = useState<'given' | 'repayments'>('given');

  // Modal open states
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);

  // Inline editing state for loan amount
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>('');

  // Form states - Loan
  const [memberNo, setMemberNo] = useState('');
  const [loanDate, setLoanDate] = useState(new Date().toISOString().split('T')[0]);
  const [loanAmount, setLoanAmount] = useState('');
  const [loanReason, setLoanReason] = useState('');
  const [loanNotes, setLoanNotes] = useState('');
  const [loanPayMode, setLoanPayMode] = useState<'Cash' | 'Google Pay'>('Google Pay');
  const [isCustomMember, setIsCustomMember] = useState(false);
  const [customMemberName, setCustomMemberName] = useState('');

  // Form states - Repayment
  const [repayMemberNo, setRepayMemberNo] = useState('');
  const [repayDate, setRepayDate] = useState(new Date().toISOString().split('T')[0]);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayPayMode, setRepayPayMode] = useState<'Cash' | 'Google Pay'>('Google Pay');
  const [repayNotes, setRepayNotes] = useState('');

  // Delete flow state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'loan' | 'repayment' } | null>(null);

  // Filter members that are active
  const activeMembers = useMemo(() => {
    return members.filter((m) => m.status === 'Active');
  }, [members]);

  // Filter only 'loan' type (for backward compatibility, empty/undefined type is also 'loan')
  const actualLoans = useMemo(() => {
    return loans.filter((l) => l.type === 'loan' || !l.type);
  }, [loans]);

  // Aggregate sums
  const totalGiven = useMemo(() => {
    return actualLoans.reduce((sum, l) => sum + l.amount, 0);
  }, [actualLoans]);

  const totalRepaid = useMemo(() => {
    return repayments.reduce((sum, r) => sum + r.amount, 0);
  }, [repayments]);

  const remainingBalance = totalGiven - totalRepaid;

  // Members with active/outstanding loans from the actualLoans list
  const loanBeneficiaries = useMemo(() => {
    const uniqueMap = new Map<string, string>(); // memberNo -> memberName
    actualLoans.forEach((l) => {
      if (l.amount > 0) {
        uniqueMap.set(l.memberNo, l.memberName);
      }
    });
    return Array.from(uniqueMap.entries()).map(([memberNo, memberName]) => ({
      memberNo,
      memberName
    }));
  }, [actualLoans]);

  const selectedMemberLoansSum = useMemo(() => {
    if (!repayMemberNo) return 0;
    return actualLoans
      .filter((l) => l.memberNo === repayMemberNo)
      .reduce((sum, l) => sum + l.amount, 0);
  }, [repayMemberNo, actualLoans]);

  // Save new loan disbursement
  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalMemberNo = isCustomMember ? `CUST-${Date.now().toString().slice(-6)}` : memberNo;
    const finalMemberName = isCustomMember ? customMemberName.trim() : '';

    if (isCustomMember) {
      if (!customMemberName.trim() || !loanAmount || !loanReason) {
        addToast('Please fill all required fields', 'error');
        return;
      }
    } else {
      if (!memberNo || !loanAmount || !loanReason) {
        addToast('Please fill all required fields', 'error');
        return;
      }
    }

    const amt = parseFloat(loanAmount);
    if (isNaN(amt) || amt <= 0) {
      addToast('Invalid loan amount', 'error');
      return;
    }

    let selectedMemberName = '';
    if (isCustomMember) {
      selectedMemberName = finalMemberName;
    } else {
      const selectedMember = members.find((m) => m.memberNo === memberNo);
      if (!selectedMember) return;
      selectedMemberName = selectedMember.memberName;
    }

    const loanObj: Loan = {
      id: `loan_${Date.now()}`,
      memberNo: finalMemberNo,
      memberName: selectedMemberName,
      date: loanDate,
      amount: amt,
      reason: loanReason.trim(),
      notes: loanNotes.trim(),
      paymentMode: loanPayMode,
      createdAt: Date.now(),
      type: 'loan' // Explicitly set to 'loan'
    };

    try {
      await saveLoan(loanObj);
      addToast(`Loan of ₹${amt.toLocaleString('en-IN')} approved for ${selectedMemberName}`, 'success');
      setIsLoanModalOpen(false);

      // Reset
      setMemberNo('');
      setCustomMemberName('');
      setIsCustomMember(false);
      setLoanAmount('');
      setLoanReason('');
      setLoanNotes('');
      setLoanPayMode('Google Pay');
    } catch (err) {
      console.error(err);
      addToast('Failed to save loan disbursement', 'error');
    }
  };

  // Save repayment received
  const handleSaveRepayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!repayMemberNo || !repayAmount) {
      addToast('Please select member and amount', 'error');
      return;
    }

    const amt = parseFloat(repayAmount);
    if (isNaN(amt) || amt <= 0) {
      addToast('Invalid repayment amount', 'error');
      return;
    }

    // Verify member has active loan balance
    const memberLoansSum = actualLoans.filter((l) => l.memberNo === repayMemberNo).reduce((sum, l) => sum + l.amount, 0);

    if (amt > memberLoansSum) {
      addToast(`Repayment ₹${amt} exceeds member's active loan balance of ₹${memberLoansSum}`, 'error');
      return;
    }

    // Find the loans of this member, sorted by date (oldest first)
    const memberLoans = [...actualLoans]
      .filter((l) => l.memberNo === repayMemberNo)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    if (memberLoans.length === 0) {
      addToast('No active loan found for this member', 'error');
      return;
    }

    // Deduct the repayment amount from the member's loans (FIFO)
    let remainingRepay = amt;
    let appliedLoanId = 'general';

    try {
      for (const loan of memberLoans) {
        if (remainingRepay <= 0) break;
        appliedLoanId = loan.id; // Link to the last loan we deduct from

        if (loan.amount >= remainingRepay) {
          const updatedLoan: Loan = {
            ...loan,
            amount: loan.amount - remainingRepay
          };
          await saveLoan(updatedLoan);
          remainingRepay = 0;
        } else {
          remainingRepay -= loan.amount;
          const updatedLoan: Loan = {
            ...loan,
            amount: 0
          };
          await saveLoan(updatedLoan);
        }
      }

      const selectedMember = members.find((m) => m.memberNo === repayMemberNo);
      const memberName = selectedMember ? selectedMember.memberName : (memberLoans[0]?.memberName || 'Custom Beneficiary');

      const repObj: LoanRepayment = {
        id: `rep_${Date.now()}`,
        loanId: appliedLoanId, // Link to the specific loan
        memberNo: repayMemberNo,
        memberName: memberName,
        date: repayDate,
        amount: amt,
        paymentMode: repayPayMode,
        notes: repayNotes.trim(),
        createdAt: Date.now()
      };

      await saveRepayment(repObj);
      addToast(`Repayment of ₹${amt.toLocaleString('en-IN')} logged and subtracted from ${memberName}'s loan`, 'success');
      setIsRepayModalOpen(false);

      // Reset
      setRepayMemberNo('');
      setRepayAmount('');
      setRepayNotes('');
      setRepayPayMode('Google Pay');
    } catch (err) {
      console.error(err);
      addToast('Failed to log loan repayment', 'error');
    }
  };

  // Confirm and delete ledger entry
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'loan') {
        await deleteLoan(deleteTarget.id);
        addToast('Loan disbursement cleared successfully', 'success');
      } else {
        // Retrieve the repayment first to find its loanId and amount
        const repaymentToDelete = repayments.find(r => r.id === deleteTarget.id);
        if (repaymentToDelete) {
          // Add amount back to the loan if loanId is valid
          if (repaymentToDelete.loanId && repaymentToDelete.loanId !== 'general') {
            const associatedLoan = actualLoans.find(l => l.id === repaymentToDelete.loanId);
            if (associatedLoan) {
              const updatedLoan: Loan = {
                ...associatedLoan,
                amount: associatedLoan.amount + repaymentToDelete.amount
              };
              await saveLoan(updatedLoan);
            }
          }
        }
        await deleteRepayment(deleteTarget.id);
        addToast('Loan repayment receipt cleared successfully', 'success');
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      addToast('Failed to delete transaction', 'error');
    }
  };

  const handleUpdateAmount = async (loan: Loan) => {
    const amt = parseFloat(editingAmount);
    if (isNaN(amt) || amt <= 0) {
      addToast('Invalid loan amount', 'error');
      return;
    }

    const updatedLoan: Loan = {
      ...loan,
      amount: amt
    };

    try {
      await saveLoan(updatedLoan);
      addToast(`Loan amount updated to ₹${amt.toLocaleString('en-IN')} for ${loan.memberName}`, 'success');
      setEditingLoanId(null);
      setEditingAmount('');
    } catch (err) {
      console.error(err);
      addToast('Failed to update loan amount', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <ArrowRightLeft className="w-5 h-5" />
            </span>
            Loans & Repayments Ledger
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Track interest-free charity loans and repayment logs for members.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex gap-2.5">
          <button
            onClick={() => setIsRepayModalOpen(true)}
            className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
            id="loans-add-repay-btn"
          >
            <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Receive Repayment
          </button>
          <button
            onClick={() => setIsLoanModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            id="loans-add-loan-btn"
          >
            <Plus className="w-4 h-4" />
            Give Loan
          </button>
        </div>
      </div>

      {/* Aggregate Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Total Given */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Loans Given</p>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
              ₹{totalGiven.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-zinc-400 font-medium">All approved charity loans</p>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total Repaid */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Returned</p>
            <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              ₹{totalRepaid.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-zinc-400 font-medium">Successful repayments received</p>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Net Remaining Balance */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Remaining Balance</p>
            <h3 className={`text-2xl font-black ${remainingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
              ₹{remainingBalance.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-zinc-400 font-medium">Active collectible credit</p>
          </div>
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Subtab Selectors (Disbursed Loans vs Repayments logs) */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/60 p-1.5 rounded-2xl w-full max-w-sm">
        <button
          onClick={() => setActiveSubTab('given')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'given'
              ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
          id="loans-tab-given"
        >
          Approved Loans
        </button>
        <button
          onClick={() => setActiveSubTab('repayments')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'repayments'
              ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
          id="loans-tab-repayments"
        >
          Repayments Log
        </button>
      </div>

      {/* Ledger Lists */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        {activeSubTab === 'given' ? (
          /* Given Loans Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="loans-given-table">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400 dark:text-zinc-500 text-xs uppercase font-bold tracking-wider">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Member</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Payment Mode</th>
                  <th className="px-6 py-4">Notes</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                {actualLoans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-zinc-400 font-medium">
                      No disbursed loans found in the registry.
                    </td>
                  </tr>
                ) : (
                  actualLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-800/10 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-zinc-500 dark:text-zinc-400">
                        {loan.date}
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-100">
                        <span className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold mr-2 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                          {loan.memberNo}
                        </span>
                        {loan.memberName}
                      </td>
                      <td className="px-6 py-4 font-extrabold font-mono text-rose-600 dark:text-rose-400">
                        {editingLoanId === loan.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-500 dark:text-zinc-400">₹</span>
                            <input
                              type="number"
                              value={editingAmount}
                              onChange={(e) => setEditingAmount(e.target.value)}
                              className="w-28 px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold text-sm"
                              id={`edit-amount-input-${loan.id}`}
                              autoFocus
                            />
                          </div>
                        ) : (
                          `₹${loan.amount.toLocaleString('en-IN')}`
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-zinc-800 dark:text-zinc-200">
                        {loan.reason}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {loan.paymentMode || 'Cash'}
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-400 dark:text-zinc-500 italic max-w-xs truncate">
                        {loan.notes || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editingLoanId === loan.id ? (
                          <div className="flex justify-end items-center gap-1.5">
                            <button
                              onClick={() => handleUpdateAmount(loan)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 transition-colors cursor-pointer"
                              title="Save"
                              id={`save-amount-btn-${loan.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingLoanId(null);
                                setEditingAmount('');
                              }}
                              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                              title="Cancel"
                              id={`cancel-amount-btn-${loan.id}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end items-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingLoanId(loan.id);
                                setEditingAmount(loan.amount.toString());
                              }}
                              className="p-1.5 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                              title="Edit Amount"
                              id={`edit-loan-btn-${loan.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ id: loan.id, type: 'loan' })}
                              className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete Record"
                              id={`delete-loan-btn-${loan.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Repayments Received Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="loans-repayments-table">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400 dark:text-zinc-500 text-xs uppercase font-bold tracking-wider">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Member</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Payment Mode</th>
                  <th className="px-6 py-4">Remarks/Notes</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                {repayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-zinc-400 font-medium">
                      No repayments logged yet.
                    </td>
                  </tr>
                ) : (
                  repayments.map((rep) => (
                    <tr key={rep.id} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-800/10 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-zinc-500 dark:text-zinc-400">
                        {rep.date}
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-100">
                        <span className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold mr-2 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                          {rep.memberNo}
                        </span>
                        {rep.memberName}
                      </td>
                      <td className="px-6 py-4 font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                        ₹{rep.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {rep.paymentMode || 'Cash'}
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-400 dark:text-zinc-500 italic max-w-xs truncate">
                        {rep.notes || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setDeleteTarget({ id: rep.id, type: 'repayment' })}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete Record"
                          id={`delete-repay-btn-${rep.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Give Loan Modal */}
      <AnimatePresence>
        {isLoanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoanModalOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 z-10"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-700 to-amber-600 p-5 text-white flex items-center justify-between">
                <h3 className="font-bold text-base" id="loan-modal-title">Disburse Charity Loan</h3>
                <button onClick={() => setIsLoanModalOpen(false)} className="text-white/80 hover:text-white" id="close-loan-modal-btn">
                  ×
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveLoan} className="p-6 space-y-4">
                {/* Select Member */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                      Beneficiary *
                    </label>
                    <label className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-bold cursor-pointer hover:underline selection:bg-transparent">
                      <input
                        type="checkbox"
                        checked={isCustomMember}
                        onChange={(e) => {
                          setIsCustomMember(e.target.checked);
                          setMemberNo('');
                          setCustomMemberName('');
                        }}
                        className="rounded border-zinc-300 dark:border-zinc-700 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      Type Custom Name
                    </label>
                  </div>
                  
                  {isCustomMember ? (
                    <input
                      type="text"
                      required
                      value={customMemberName}
                      onChange={(e) => setCustomMemberName(e.target.value)}
                      placeholder="Type beneficiary name here..."
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-sm"
                      id="loan-form-member-custom-input"
                    />
                  ) : (
                    <select
                      required
                      value={memberNo}
                      onChange={(e) => setMemberNo(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-sm"
                      id="loan-form-member-select"
                    >
                      <option value="">-- Choose Member --</option>
                      {activeMembers.map((m) => (
                        <option key={m.memberNo} value={m.memberNo}>
                          [{m.memberNo}] {m.memberName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Amount and Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={loanDate}
                      onChange={(e) => setLoanDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                      id="loan-form-date"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-sm"
                      placeholder="e.g. 5000"
                      id="loan-form-amount"
                    />
                  </div>
                </div>

                {/* Payment Mode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Payment Mode
                  </label>
                  <div className="flex gap-2">
                    {(['Cash', 'Google Pay'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setLoanPayMode(mode)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          loanPayMode === mode
                            ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-500 shadow-xs'
                            : 'bg-zinc-50 dark:bg-zinc-800/20 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                        }`}
                        id={`loan-form-paymode-${mode.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Reason for Loan *
                  </label>
                  <input
                    type="text"
                    required
                    value={loanReason}
                    onChange={(e) => setLoanReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                    placeholder="e.g. Marriage assistance"
                    id="loan-form-reason"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Private Ledger Notes
                  </label>
                  <textarea
                    rows={2}
                    value={loanNotes}
                    onChange={(e) => setLoanNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    placeholder="Enter additional terms or details"
                    id="loan-form-notes"
                  />
                </div>

                {/* Buttons */}
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsLoanModalOpen(false)}
                    className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                    id="loan-form-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-amber-700 hover:bg-amber-600 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                    id="loan-form-submit"
                  >
                    Approve Loan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receive Repayment Modal */}
      <AnimatePresence>
        {isRepayModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRepayModalOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 z-10"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 p-5 text-white flex items-center justify-between">
                <h3 className="font-bold text-base" id="repay-modal-title">Record Loan Repayment</h3>
                <button onClick={() => setIsRepayModalOpen(false)} className="text-white/80 hover:text-white">
                  ×
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveRepayment} className="p-6 space-y-4">
                {/* Select Member */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Paying Member *
                  </label>
                  <select
                    required
                    value={repayMemberNo}
                    onChange={(e) => setRepayMemberNo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm"
                    id="repay-form-member-select"
                  >
                    <option value="">-- Choose Beneficiary --</option>
                    {loanBeneficiaries.map((m) => (
                      <option key={m.memberNo} value={m.memberNo}>
                        [{m.memberNo}] {m.memberName}
                      </option>
                    ))}
                  </select>
                </div>

                {repayMemberNo && (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider">
                        Current Outstanding Loan
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Total unpaid loan amount for this member
                      </p>
                    </div>
                    <span className="text-lg font-black font-mono text-rose-700 dark:text-rose-400">
                      ₹{selectedMemberLoansSum.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {/* Amount and Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                      Date Received *
                    </label>
                    <input
                      type="date"
                      required
                      value={repayDate}
                      onChange={(e) => setRepayDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                      id="repay-form-date"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-sm"
                      placeholder="e.g. 1000"
                      id="repay-form-amount"
                    />
                  </div>
                </div>

                {/* Payment Mode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Payment Mode
                  </label>
                  <div className="flex gap-2">
                    {(['Cash', 'Google Pay'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setRepayPayMode(mode)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          repayPayMode === mode
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-500 shadow-xs'
                            : 'bg-zinc-50 dark:bg-zinc-800/20 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                        }`}
                        id={`repay-form-paymode-${mode.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Ledger Notes/Receipt Details
                  </label>
                  <input
                    type="text"
                    value={repayNotes}
                    onChange={(e) => setRepayNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                    placeholder="e.g. Installment #3, Google Pay ref: 12345"
                    id="repay-form-notes"
                  />
                </div>

                {/* Buttons */}
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRepayModalOpen(false)}
                    className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                    id="repay-form-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                    id="repay-form-submit"
                  >
                    Log Repayment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title={deleteTarget?.type === 'loan' ? 'Delete Loan' : 'Delete Repayment'}
        message="Are you sure you want to delete this transaction record? This will alter total balance calculations and cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
