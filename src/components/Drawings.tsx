import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Calendar,
  ArrowRightLeft,
  Search,
  DollarSign,
  Wallet,
  ArrowRight,
  Edit2,
  Repeat,
  Download,
  Building,
  HandCoins,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { Drawing } from '../types';
import { saveDrawing, deleteDrawing } from '../firebase';
import ConfirmModal from './ConfirmModal';

interface DrawingsProps {
  drawings: Drawing[];
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function Drawings({ drawings, addToast }: DrawingsProps) {
  // Modal open state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDrawingId, setEditingDrawingId] = useState<string | null>(null);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [direction, setDirection] = useState<'gpay-to-hand' | 'hand-to-gpay'>('gpay-to-hand');

  // Search/Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState<'all' | 'gpay-to-hand' | 'hand-to-gpay'>('all');

  // Delete flow state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Totals calculations
  const totalGpayToHand = useMemo(() => {
    return drawings
      .filter((d) => (d.fromAccount === 'Google Pay' || !d.fromAccount) && (d.toAccount === 'Hand' || !d.toAccount || d.toAccount === 'Cash in Hand'))
      .reduce((sum, d) => sum + d.amount, 0);
  }, [drawings]);

  const totalHandToGpay = useMemo(() => {
    return drawings
      .filter((d) => (d.fromAccount === 'Hand' || d.fromAccount === 'Cash in Hand') && d.toAccount === 'Google Pay')
      .reduce((sum, d) => sum + d.amount, 0);
  }, [drawings]);

  const netBalanceShift = totalGpayToHand - totalHandToGpay;

  // Filtered drawings
  const filteredDrawings = useMemo(() => {
    return drawings.filter((d) => {
      const term = searchTerm.toLowerCase();
      const isGpayToHand = (d.fromAccount === 'Google Pay' || !d.fromAccount) && (d.toAccount === 'Hand' || !d.toAccount || d.toAccount === 'Cash in Hand');
      const isHandToGpay = (d.fromAccount === 'Hand' || d.fromAccount === 'Cash in Hand') && d.toAccount === 'Google Pay';

      if (routeFilter === 'gpay-to-hand' && !isGpayToHand) return false;
      if (routeFilter === 'hand-to-gpay' && !isHandToGpay) return false;

      return (
        d.description.toLowerCase().includes(term) ||
        d.amount.toString().includes(term) ||
        d.date.includes(term) ||
        d.fromAccount.toLowerCase().includes(term) ||
        d.toAccount.toLowerCase().includes(term)
      );
    });
  }, [drawings, searchTerm, routeFilter]);

  // Open modal for new entry
  const handleOpenNewModal = () => {
    setEditingDrawingId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setAmount('');
    setDescription('');
    setDirection('gpay-to-hand');
    setIsModalOpen(true);
  };

  // Open modal for editing existing entry
  const handleOpenEditModal = (d: Drawing) => {
    setEditingDrawingId(d.id);
    setDate(d.date || new Date().toISOString().split('T')[0]);
    setAmount(d.amount.toString());
    setDescription(d.description || '');
    const isHandToGpay = (d.fromAccount === 'Hand' || d.fromAccount === 'Cash in Hand') && d.toAccount === 'Google Pay';
    setDirection(isHandToGpay ? 'hand-to-gpay' : 'gpay-to-hand');
    setIsModalOpen(true);
  };

  // Swap direction in form
  const handleSwapDirection = () => {
    setDirection((prev) => (prev === 'gpay-to-hand' ? 'hand-to-gpay' : 'gpay-to-hand'));
  };

  // Quick switch route on table row
  const handleQuickToggleRow = async (d: Drawing) => {
    const isHandToGpay = (d.fromAccount === 'Hand' || d.fromAccount === 'Cash in Hand') && d.toAccount === 'Google Pay';
    const newFrom = isHandToGpay ? 'Google Pay' : 'Hand';
    const newTo = isHandToGpay ? 'Hand' : 'Google Pay';
    const newDesc = isHandToGpay
      ? (d.description.includes('Hand to G Pay') ? d.description.replace('Hand to G Pay', 'G Pay to Hand') : d.description)
      : (d.description.includes('G Pay to Hand') ? d.description.replace('G Pay to Hand', 'Hand to G Pay') : d.description);

    const updated: Drawing = {
      ...d,
      fromAccount: newFrom,
      toAccount: newTo,
      description: newDesc
    };

    try {
      await saveDrawing(updated);
      addToast(
        `Route switched to ${newFrom} ➔ ${newTo} (₹${d.amount.toLocaleString('en-IN')})`,
        'success'
      );
    } catch (err) {
      console.error(err);
      addToast('Failed to switch route', 'error');
    }
  };

  // Save or update drawing transaction
  const handleSaveDrawing = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount) {
      addToast('Please enter an amount', 'error');
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      addToast('Please enter a valid amount', 'error');
      return;
    }

    const fromAcc = direction === 'gpay-to-hand' ? 'Google Pay' : 'Hand';
    const toAcc = direction === 'gpay-to-hand' ? 'Hand' : 'Google Pay';

    const defaultDesc = direction === 'gpay-to-hand'
      ? 'Bank withdrawal (G Pay to Hand)'
      : 'Cash deposit (Hand to G Pay)';

    const existingDrawing = editingDrawingId ? drawings.find((d) => d.id === editingDrawingId) : null;

    const drawingObj: Drawing = {
      id: editingDrawingId || `draw_${Date.now()}`,
      date,
      amount: amt,
      description: description.trim() || defaultDesc,
      fromAccount: fromAcc,
      toAccount: toAcc,
      createdAt: existingDrawing?.createdAt || Date.now()
    };

    try {
      await saveDrawing(drawingObj);
      if (editingDrawingId) {
        addToast(
          `Updated fund transfer of ₹${amt.toLocaleString('en-IN')} (${fromAcc} ➔ ${toAcc})`,
          'success'
        );
      } else {
        addToast(
          `Recorded fund transfer of ₹${amt.toLocaleString('en-IN')} (${fromAcc} ➔ ${toAcc})`,
          'success'
        );
      }
      setIsModalOpen(false);

      // Reset
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setEditingDrawingId(null);
    } catch (err) {
      console.error(err);
      addToast('Failed to save fund transfer record', 'error');
    }
  };

  // Confirm and delete record
  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;

    try {
      await deleteDrawing(deleteTargetId);
      addToast('Fund transfer record deleted successfully', 'success');
      setDeleteTargetId(null);
    } catch (err) {
      console.error(err);
      addToast('Failed to delete transfer record', 'error');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredDrawings.map((d) => {
      const isGPayToHand = (d.fromAccount === 'Google Pay' || !d.fromAccount) && (d.toAccount === 'Hand' || !d.toAccount || d.toAccount === 'Cash in Hand');
      return {
        'Date': d.date,
        'From Account': d.fromAccount || 'Google Pay',
        'To Account': d.toAccount || 'Hand',
        'Transfer Type': isGPayToHand ? 'Google Pay to Hand (Withdrawal)' : 'Hand to Google Pay (Deposit)',
        'Amount (INR)': d.amount,
        'Description': d.description
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Drawings & Transfers');
    XLSX.writeFile(workbook, `USBA_Drawings_Transfers_${new Date().toISOString().split('T')[0]}.xlsx`);
    addToast('Transfers exported to Excel', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Title section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-xl">
              <ArrowRightLeft className="w-5 h-5" />
            </span>
            Drawings & Internal Fund Transfers
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Transfer and reallocate funds between Google Pay (Bank) and Hand (Physical Cash) in both directions.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
            id="drawings-export-excel-btn"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Export Excel
          </button>
          <button
            onClick={handleOpenNewModal}
            className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            id="drawings-add-btn"
          >
            <Plus className="w-4 h-4" />
            New Transfer
          </button>
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
        {/* Card 1: GPay to Hand */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-5 rounded-3xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block flex items-center gap-1">
              <Building className="w-3.5 h-3.5" /> G Pay ➔ Hand
            </span>
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 font-mono block">
              ₹{totalGpayToHand.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">
              Cash Withdrawn from Bank
            </span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 rounded-2xl">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Hand to GPay */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-5 rounded-3xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
              <HandCoins className="w-3.5 h-3.5" /> Hand ➔ G Pay
            </span>
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 font-mono block">
              ₹{totalHandToGpay.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">
              Cash Deposited to Bank
            </span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-2xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Summary / Count */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-5 rounded-3xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              Total Transfers Logged
            </span>
            <span className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-400 font-mono block">
              {drawings.length}
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">
              Net Shift: ₹{netBalanceShift >= 0 ? `+${netBalanceShift.toLocaleString('en-IN')}` : netBalanceShift.toLocaleString('en-IN')} to Hand
            </span>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-2xl">
            <Repeat className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and List */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by purpose, amount, date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-medium"
                id="drawings-search"
              />
            </div>

            {/* Route Filter Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                value={routeFilter}
                onChange={(e) => setRouteFilter(e.target.value as any)}
                className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold cursor-pointer"
                id="drawings-route-filter"
              >
                <option value="all">All Transfer Routes</option>
                <option value="gpay-to-hand">G Pay ➔ Hand (Withdrawals)</option>
                <option value="hand-to-gpay">Hand ➔ G Pay (Deposits)</option>
              </select>
            </div>
          </div>

          <div className="text-xs font-bold text-zinc-400 font-mono uppercase">
            Showing {filteredDrawings.length} of {drawings.length} records
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Transfer Date</th>
                <th className="px-6 py-4">Transfer Route (Click to Switch)</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Description / Purpose</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm font-medium">
              {filteredDrawings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-zinc-400 font-medium font-sans">
                    No drawings or fund transfers found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredDrawings.map((d) => {
                  const isHandToGpay = (d.fromAccount === 'Hand' || d.fromAccount === 'Cash in Hand') && d.toAccount === 'Google Pay';
                  return (
                    <tr key={d.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors group">
                      {/* Date */}
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          {d.date}
                        </div>
                      </td>

                      {/* Interactive Route Pill */}
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleQuickToggleRow(d)}
                          title="Click to instantly switch between G Pay ➔ Hand and Hand ➔ G Pay"
                          className="group/btn inline-flex items-center gap-2 px-3 py-1 rounded-xl border transition-all cursor-pointer hover:shadow-xs"
                          style={{
                            backgroundColor: isHandToGpay ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                            borderColor: isHandToGpay ? 'rgba(16, 185, 129, 0.25)' : 'rgba(59, 130, 246, 0.25)'
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[11px] font-bold ${
                                isHandToGpay ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400'
                              }`}
                            >
                              {d.fromAccount || (isHandToGpay ? 'Hand' : 'Google Pay')}
                            </span>
                            <ArrowRight className="w-3 h-3 text-zinc-400 group-hover/btn:rotate-180 transition-transform duration-200" />
                            <span
                              className={`text-[11px] font-bold ${
                                isHandToGpay ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {d.toAccount || (isHandToGpay ? 'Google Pay' : 'Hand')}
                            </span>
                          </div>

                          <span className="p-0.5 bg-white dark:bg-zinc-800 rounded-md text-zinc-400 group-hover/btn:text-indigo-600 shadow-2xs">
                            <Repeat className="w-3 h-3" />
                          </span>
                        </button>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 text-zinc-900 dark:text-zinc-100 font-bold font-mono">
                        <span className={isHandToGpay ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-400'}>
                          ₹{d.amount.toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                        {d.description || (isHandToGpay ? 'Cash deposit (Hand to G Pay)' : 'Bank withdrawal (G Pay to Hand)')}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit button */}
                          <button
                            onClick={() => handleOpenEditModal(d)}
                            className="p-1.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Edit transfer details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => setDeleteTargetId(d.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Delete transfer record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record/Edit Transfer modal */}
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
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 z-10"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-800 to-indigo-700 p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">
                    {editingDrawingId ? 'Edit Fund Transfer' : 'Record Fund Transfer'}
                  </h3>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Move funds between Google Pay and Physical Cash
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-white/80 hover:text-white text-2xl leading-none cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveDrawing} className="p-6 space-y-5">
                {/* Direction Switcher Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Transfer Direction *
                    </label>
                    <button
                      type="button"
                      onClick={handleSwapDirection}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                    >
                      <Repeat className="w-3.5 h-3.5" />
                      Swap Direction
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Option 1: GPay -> Hand */}
                    <button
                      type="button"
                      onClick={() => setDirection('gpay-to-hand')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        direction === 'gpay-to-hand'
                          ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-md uppercase">
                          Withdrawal
                        </span>
                        {direction === 'gpay-to-hand' && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        <span className="text-blue-600 dark:text-blue-400">Google Pay</span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-amber-600 dark:text-amber-400">Hand</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                        Disburse cash from bank account
                      </p>
                    </button>

                    {/* Option 2: Hand -> GPay */}
                    <button
                      type="button"
                      onClick={() => setDirection('hand-to-gpay')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        direction === 'hand-to-gpay'
                          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-md uppercase">
                          Deposit
                        </span>
                        {direction === 'hand-to-gpay' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        <span className="text-amber-600 dark:text-amber-400">Hand</span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-blue-600 dark:text-blue-400">Google Pay</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                        Deposit physical cash into bank
                      </p>
                    </button>
                  </div>
                </div>

                {/* Date & Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-sm"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Description / Purpose
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      direction === 'gpay-to-hand'
                        ? 'e.g. Cash in hand for urgent loans'
                        : 'e.g. Excess collection deposited to G Pay account'
                    }
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                  />
                </div>

                {/* Buttons */}
                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    {editingDrawingId ? 'Update Record' : 'Record Transfer'}
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
        title="Delete Fund Transfer Record"
        message="Are you sure you want to delete this fund transfer record? This will instantly adjust the Hand and Google Pay balances."
      />
    </div>
  );
}

