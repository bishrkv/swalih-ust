import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Save,
  Trash2,
  Coins,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  Search,
  Filter,
  CheckSquare,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { Member, MonthlyCollection as ColType } from '../types';
import { saveMonthlyCollection, deleteMonthlyCollection } from '../firebase';

interface MonthlyCollectionProps {
  members: Member[];
  collections: ColType[];
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

const YEARS = ['2025-2026', '2026-2027', '2027-2028', '2028-2029'];
const MONTHS = [
  'May', 'June', 'July', 'August', 'September', 'October',
  'November', 'December', 'January', 'February', 'March', 'April'
];

export default function MonthlyCollection({
  members,
  collections,
  addToast
}: MonthlyCollectionProps) {
  // Selection states
  const [selectedYear, setSelectedYear] = useState('2026-2027');
  const [selectedMonth, setSelectedMonth] = useState('July');
  const [searchTerm, setSearchTerm] = useState('');

  // Local editing buffer for each member: { [memberNo]: { amount, status, remarks, paymentMode } }
  const [editBuffer, setEditBuffer] = useState<{
    [memberNo: string]: {
      amount: string;
      status: 'Paid' | 'Pending';
      remarks: string;
      paymentMode: 'Cash' | 'Google Pay';
    };
  }>({});

  // Reset editing buffer when changing year or month
  React.useEffect(() => {
    setEditBuffer({});
  }, [selectedYear, selectedMonth]);

  // Aggregate collections specifically for the current selected year and month
  const currentCollectionsMap = useMemo(() => {
    const map: { [memberNo: string]: ColType } = {};
    collections.forEach((c) => {
      if (c.year === selectedYear && c.month === selectedMonth) {
        map[c.memberNo] = c;
      }
    });
    return map;
  }, [collections, selectedYear, selectedMonth]);

  // Calculate each member's overall grand total paid (all-time)
  const memberGrandTotals = useMemo(() => {
    const map: { [memberNo: string]: number } = {};
    collections.forEach((c) => {
      if (c.status === 'Paid') {
        map[c.memberNo] = (map[c.memberNo] || 0) + c.amount;
      }
    });
    return map;
  }, [collections]);

  // Calculate current monthly grand total (amount sum of paid status in selected year/month)
  const monthlyGrandTotal = useMemo(() => {
    return (Object.values(currentCollectionsMap) as ColType[])
      .filter((c) => c.status === 'Paid')
      .reduce((sum, c) => sum + c.amount, 0);
  }, [currentCollectionsMap]);

  // Handle local buffer edits
  const handleCellChange = (memberNo: string, field: string, value: any) => {
    const existing = currentCollectionsMap[memberNo];
    const bufferVal = editBuffer[memberNo] || {
      amount: existing ? existing.amount.toString() : '2500', // default collection
      status: existing ? existing.status : 'Pending',
      remarks: existing ? existing.remarks : '',
      paymentMode: existing ? existing.paymentMode : 'Google Pay'
    };

    const updated = {
      ...bufferVal,
      [field]: value
    };

    setEditBuffer({
      ...editBuffer,
      [memberNo]: updated
    });
  };

  // Get current row cell values (falling back to Firestore, then to defaults)
  const getCellValue = (memberNo: string) => {
    const existing = currentCollectionsMap[memberNo];
    const buffer = editBuffer[memberNo];

    if (buffer) {
      return {
        amount: buffer.amount,
        status: buffer.status,
        remarks: buffer.remarks,
        paymentMode: buffer.paymentMode,
        isDirty: true
      };
    }

    return {
      amount: existing ? existing.amount.toString() : '2500', // standard default amount
      status: existing ? existing.status : 'Pending',
      remarks: existing ? existing.remarks : '',
      paymentMode: existing ? (existing.paymentMode || 'Google Pay') : 'Google Pay',
      isDirty: false
    };
  };

  // Save/Update a single row
  const handleSaveRow = async (member: Member) => {
    const cellVal = getCellValue(member.memberNo);
    const amt = parseFloat(cellVal.amount);

    if (isNaN(amt) || amt < 0) {
      addToast('Please enter a valid numeric amount', 'error');
      return;
    }

    const colObj: ColType = {
      id: `${member.memberNo}_${selectedYear}_${selectedMonth}`,
      memberNo: member.memberNo,
      memberName: member.memberName,
      year: selectedYear,
      month: selectedMonth,
      amount: amt,
      status: cellVal.status,
      remarks: cellVal.remarks,
      paymentMode: cellVal.paymentMode,
      updatedAt: Date.now()
    };

    try {
      await saveMonthlyCollection(colObj);
      addToast(`Collection saved for ${member.memberName} (${selectedMonth} ${selectedYear})`, 'success');

      // Remove from edit buffer since it's saved
      const updatedBuffer = { ...editBuffer };
      delete updatedBuffer[member.memberNo];
      setEditBuffer(updatedBuffer);
    } catch (err) {
      console.error(err);
      addToast('Failed to save monthly collection', 'error');
    }
  };

  // Delete a collection record (reset back to Pending default)
  const handleDeleteRow = async (member: Member) => {
    const existing = currentCollectionsMap[member.memberNo];
    if (!existing) {
      addToast('No saved collection record exists for this member in this period.', 'info');
      return;
    }

    try {
      await deleteMonthlyCollection(existing.id);
      addToast(`Collection record cleared for ${member.memberName}`, 'success');

      // Clear any buffer
      const updatedBuffer = { ...editBuffer };
      delete updatedBuffer[member.memberNo];
      setEditBuffer(updatedBuffer);
    } catch (err) {
      console.error(err);
      addToast('Failed to clear collection record', 'error');
    }
  };

  // Filter members list based on active state and search
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Show all active members, or inactive only if they have a saved payment for this period
      const hasCollection = !!currentCollectionsMap[m.memberNo];
      const matchesActive = m.status === 'Active' || hasCollection;

      const matchesSearch =
        m.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.memberNo.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesActive && matchesSearch;
    });
  }, [members, currentCollectionsMap, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <CheckSquare className="w-5 h-5" />
            </span>
            Monthly Collection Matrix
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Log, update, and manage monthly fund payments in a spreadsheet layout.
          </p>
        </div>

        {/* Grand Total display card */}
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 flex items-center gap-4 shrink-0 shadow-xs">
          <div className="p-3 bg-emerald-600 text-white rounded-xl">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold uppercase tracking-wider">
              {selectedMonth} {selectedYear} Grand Total
            </p>
            <h2 className="text-xl font-black text-emerald-700 dark:text-emerald-300">
              ₹{monthlyGrandTotal.toLocaleString('en-IN')}
            </h2>
          </div>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4 rounded-3xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Select Year */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold"
              id="collection-year-selector"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Select Month */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold"
              id="collection-month-selector"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Member Search filter */}
        <div className="relative w-full md:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            placeholder="Search member..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
            id="collection-search-input"
          />
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="collection-grid-table">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400 dark:text-zinc-500 text-xs uppercase font-bold tracking-wider">
                <th className="px-6 py-4 w-20">No.</th>
                <th className="px-6 py-4 w-48">Member Name</th>
                <th className="px-6 py-4 w-32">Amount (₹)</th>
                <th className="px-6 py-4 w-36">Status</th>
                <th className="px-6 py-4 w-40">Payment Mode</th>
                <th className="px-6 py-4">Remarks</th>
                <th className="px-6 py-4 w-28 text-center">Grand Total</th>
                <th className="px-6 py-4 w-28 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-zinc-400 font-medium">
                    No active members found.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const cell = getCellValue(member.memberNo);
                  const totalPaid = memberGrandTotals[member.memberNo] || 0;

                  return (
                    <tr
                      key={member.memberNo}
                      className={`hover:bg-zinc-50/30 dark:hover:bg-zinc-800/10 transition-colors ${
                        cell.status === 'Paid' ? 'bg-emerald-50/10 dark:bg-emerald-950/5' : ''
                      }`}
                    >
                      {/* Member No */}
                      <td className="px-6 py-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {member.memberNo}
                      </td>

                      {/* Member Name */}
                      <td className="px-6 py-4 font-bold text-zinc-800 dark:text-zinc-200">
                        {member.memberName}
                        {member.status === 'Inactive' && (
                          <span className="ml-2 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Amount Input */}
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={cell.amount}
                          onChange={(e) => handleCellChange(member.memberNo, 'amount', e.target.value)}
                          className={`w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-800 dark:text-zinc-100 ${
                            cell.isDirty ? 'border-amber-400' : 'border-zinc-200 dark:border-zinc-700'
                          }`}
                          placeholder="2500"
                          id={`collection-amount-input-${member.memberNo}`}
                        />
                      </td>

                      {/* Status Selector */}
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {(['Paid', 'Pending'] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleCellChange(member.memberNo, 'status', st)}
                              className={`flex-1 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                                cell.status === st
                                  ? st === 'Paid'
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                    : 'bg-zinc-500 border-zinc-500 text-white shadow-xs'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200'
                              }`}
                              id={`collection-status-btn-${member.memberNo}-${st.toLowerCase()}`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>

                      {/* Payment Mode Selector */}
                      <td className="px-6 py-4">
                        <select
                          value={cell.paymentMode}
                          onChange={(e) => handleCellChange(member.memberNo, 'paymentMode', e.target.value)}
                          className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-800 dark:text-zinc-100"
                          id={`collection-paymode-selector-${member.memberNo}`}
                        >
                          <option value="Cash">Cash</option>
                          <option value="Google Pay">Google Pay</option>
                        </select>
                      </td>

                      {/* Remarks */}
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={cell.remarks}
                          onChange={(e) => handleCellChange(member.memberNo, 'remarks', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-800 dark:text-zinc-100"
                          placeholder="None"
                          id={`collection-remarks-input-${member.memberNo}`}
                        />
                      </td>

                      {/* Member Grand Total Paid */}
                      <td className="px-6 py-4 text-center font-bold text-zinc-900 dark:text-zinc-50 font-mono text-xs">
                        ₹{totalPaid.toLocaleString('en-IN')}
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 shrink-0">
                          <button
                            onClick={() => handleSaveRow(member)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              cell.isDirty
                                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500'
                                : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30'
                            }`}
                            title="Save changes"
                            id={`collection-save-row-btn-${member.memberNo}`}
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRow(member)}
                            className="p-1.5 bg-zinc-50 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                            title="Clear record"
                            id={`collection-delete-row-btn-${member.memberNo}`}
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
    </div>
  );
}
