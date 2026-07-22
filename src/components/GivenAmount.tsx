import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  User,
  ArrowRightLeft,
  ChevronDown,
  Info,
  CheckCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, Loan } from '../types';
import { saveLoan, deleteLoan } from '../firebase';
import ConfirmModal from './ConfirmModal';

interface GivenAmountProps {
  members: Member[];
  loans: Loan[];
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function GivenAmount({ members, loans, addToast }: GivenAmountProps) {
  // Modal open state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [memberNo, setMemberNo] = useState('');
  const [givenDate, setGivenDate] = useState(new Date().toISOString().split('T')[0]);
  const [givenAmount, setGivenAmount] = useState('');
  const [givenReason, setGivenReason] = useState('');
  const [givenNotes, setGivenNotes] = useState('');
  const [givenPayMode, setGivenPayMode] = useState<'Cash' | 'Google Pay'>('Google Pay');

  // Delete flow state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Filter members that are active
  const activeMembers = useMemo(() => {
    return members.filter((m) => m.status === 'Active');
  }, [members]);

  // Filter only 'given' type loans
  const givenLoans = useMemo(() => {
    return loans.filter((l) => l.type === 'given');
  }, [loans]);

  // Aggregate sum
  const totalGivenAmount = useMemo(() => {
    return givenLoans.reduce((sum, l) => sum + l.amount, 0);
  }, [givenLoans]);

  // Save new Given Amount disbursement
  const handleSaveGivenAmount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!memberNo || !givenAmount || !givenReason) {
      addToast('Please fill all required fields', 'error');
      return;
    }

    const amt = parseFloat(givenAmount);
    if (isNaN(amt) || amt <= 0) {
      addToast('Invalid amount', 'error');
      return;
    }

    const selectedMember = members.find((m) => m.memberNo === memberNo);
    if (!selectedMember) return;

    const loanObj: Loan = {
      id: `given_${Date.now()}`,
      memberNo,
      memberName: selectedMember.memberName,
      date: givenDate,
      amount: amt,
      reason: givenReason.trim(),
      notes: givenNotes.trim(),
      paymentMode: givenPayMode,
      createdAt: Date.now(),
      type: 'given' // Explicitly set to 'given'
    };

    try {
      await saveLoan(loanObj);
      addToast(`Disbursement of ₹${amt.toLocaleString('en-IN')} approved for ${selectedMember.memberName}`, 'success');
      setIsModalOpen(false);

      // Reset form
      setMemberNo('');
      setGivenAmount('');
      setGivenReason('');
      setGivenNotes('');
      setGivenPayMode('Google Pay');
    } catch (err) {
      console.error(err);
      addToast('Failed to save given amount', 'error');
    }
  };

  // Confirm and delete
  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;

    try {
      await deleteLoan(deleteTargetId);
      addToast('Given amount record cleared successfully', 'success');
      setDeleteTargetId(null);
    } catch (err) {
      console.error(err);
      addToast('Failed to delete transaction', 'error');
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
            Given Amounts Ledger
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Track non-repayable capital disbursements and support given to members.
          </p>
        </div>

        {/* Header Action Button */}
        <div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            id="given-amount-add-btn"
          >
            <Plus className="w-4 h-4" />
            Add Given Amount
          </button>
        </div>
      </div>

      {/* Aggregate Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
        {/* Total Given Amount */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Given Amount</p>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
              ₹{totalGivenAmount.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-zinc-400 font-medium">All non-repayable disbursements</p>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Ledger Lists */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="given-amounts-table">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400 dark:text-zinc-500 text-xs uppercase font-bold tracking-wider">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Payment Mode</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
              {givenLoans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-zinc-400 font-medium">
                    No given amounts found in the registry.
                  </td>
                </tr>
              ) : (
                givenLoans.map((loan) => (
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
                    <td className="px-6 py-4 font-extrabold font-mono text-amber-600 dark:text-amber-400">
                      ₹{loan.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      {loan.paymentMode || 'Cash'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setDeleteTargetId(loan.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Record"
                        id={`delete-given-btn-${loan.id}`}
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
      </div>

      {/* Add Given Amount Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
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
                <h3 className="font-bold text-base" id="given-modal-title">Record Given Amount</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white" id="close-given-modal-btn">
                  ×
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveGivenAmount} className="p-6 space-y-4">
                {/* Select Member */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Beneficiary Member *
                  </label>
                  <select
                    required
                    value={memberNo}
                    onChange={(e) => setMemberNo(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-800 dark:text-zinc-100 font-bold"
                  >
                    <option value="">-- Choose Member --</option>
                    {activeMembers.map((m) => (
                      <option key={m.memberNo} value={m.memberNo}>
                        No. {m.memberNo} - {m.memberName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount and Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                      Disbursed Amount (₹) *
                    </label>
                    <input
                      required
                      type="number"
                      placeholder="e.g. 5000"
                      value={givenAmount}
                      onChange={(e) => setGivenAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-800 dark:text-zinc-100 font-bold font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                      Disbursement Date *
                    </label>
                    <input
                      required
                      type="date"
                      value={givenDate}
                      onChange={(e) => setGivenDate(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-800 dark:text-zinc-100 font-bold font-mono"
                    />
                  </div>
                </div>

                {/* Payment Mode */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Payment Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGivenPayMode('Cash')}
                      className={`py-2 px-3 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        givenPayMode === 'Cash'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      Cash Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => setGivenPayMode('Google Pay')}
                      className={`py-2 px-3 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        givenPayMode === 'Google Pay'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      Google Pay
                    </button>
                  </div>
                </div>

                {/* Purpose/Reason */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Purpose / Reason *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Charity aid, Emergency medical grant"
                    value={givenReason}
                    onChange={(e) => setGivenReason(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-800 dark:text-zinc-100 font-bold"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Additional Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide description if any..."
                    value={givenNotes}
                    onChange={(e) => setGivenNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-800 dark:text-zinc-100 font-medium"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Disburse Given Amount
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={deleteTargetId !== null}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Given Amount Transaction"
        message="Are you sure you want to permanently delete this disbursement record? This will adjust the ledger balance immediately."
      />
    </div>
  );
}
