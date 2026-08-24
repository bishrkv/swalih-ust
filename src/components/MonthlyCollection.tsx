import React, { useState, useMemo } from 'react';
import {
  Coins,
  Search,
  Trash2,
  CheckSquare,
  LayoutGrid,
  Columns,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
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
const MONTH_SHORT = [
  'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct',
  'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'
];

const getCurrentFinancialYear = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan, 4 = May
  const finYear = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  return YEARS.includes(finYear) ? finYear : '2026-2027';
};

const getCurrentMonthName = (): string => {
  const date = new Date();
  const monthName = date.toLocaleString('en-US', { month: 'long' });
  return MONTHS.includes(monthName) ? monthName : 'August';
};

export default function MonthlyCollection({
  members,
  collections,
  addToast
}: MonthlyCollectionProps) {
  const [selectedYear, setSelectedYear] = useState<string>(() => getCurrentFinancialYear());
  const [viewMode, setViewMode] = useState<'matrix' | 'single'>('single');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonthName());
  const [searchTerm, setSearchTerm] = useState('');

  // Local typing edit buffer: { [`${memberNo}_${month}`]: string }
  const [editBuffer, setEditBuffer] = useState<{ [key: string]: string }>({});

  // Reset editing buffer when changing year
  React.useEffect(() => {
    setEditBuffer({});
  }, [selectedYear]);

  // Aggregate collections for selected year: { [`${memberNo}_${month}`]: ColType }
  const yearCollectionsMap = useMemo(() => {
    const map: { [key: string]: ColType } = {};
    collections.forEach((c) => {
      if (c.year === selectedYear) {
        map[`${c.memberNo}_${c.month}`] = c;
      }
    });
    return map;
  }, [collections, selectedYear]);

  // Get cell value (from local buffer if typing, else from Firestore, else empty)
  const getCellValue = (memberNo: string, month: string): string => {
    const key = `${memberNo}_${month}`;
    if (editBuffer[key] !== undefined) {
      return editBuffer[key];
    }
    const doc = yearCollectionsMap[key];
    if (doc && doc.amount !== undefined && doc.amount !== null) {
      const num = typeof doc.amount === 'number' ? doc.amount : parseFloat(doc.amount);
      if (!isNaN(num) && num > 0) {
        return num.toString();
      }
    }
    return '';
  };

  // Get cell payment mode
  const getCellMode = (memberNo: string, month: string): 'Google Pay' | 'Cash' => {
    const key = `${memberNo}_${month}`;
    const doc = yearCollectionsMap[key];
    return doc?.paymentMode || 'Google Pay';
  };

  // Handle direct typing in any cell
  const handleCellType = (memberNo: string, month: string, value: string) => {
    const key = `${memberNo}_${month}`;
    setEditBuffer((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  // Auto-save cell when user finishes typing (onBlur or onEnter)
  const handleSaveCell = async (member: Member, month: string) => {
    const key = `${member.memberNo}_${month}`;
    const rawVal = editBuffer[key];

    // If never modified, skip
    if (rawVal === undefined) return;

    // Immediately remove from buffer to prevent state locking
    setEditBuffer((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    const trimmed = rawVal.trim();
    const existingDoc = yearCollectionsMap[key];

    if (trimmed === '' || trimmed === '0') {
      // If cleared or set to 0 and existing doc exists, delete record
      if (existingDoc) {
        try {
          await deleteMonthlyCollection(existingDoc.id);
        } catch (err) {
          console.error(err);
          addToast('Failed to clear entry', 'error');
        }
      }
      return;
    }

    const amt = parseFloat(trimmed);
    if (isNaN(amt) || amt < 0) {
      return;
    }

    const colObj: ColType = {
      id: `${member.memberNo}_${selectedYear}_${month}`,
      memberNo: member.memberNo,
      memberName: member.memberName,
      year: selectedYear,
      month: month,
      amount: amt,
      status: 'Paid',
      remarks: existingDoc?.remarks || '',
      paymentMode: existingDoc?.paymentMode || 'Google Pay',
      updatedAt: Date.now()
    };

    try {
      await saveMonthlyCollection(colObj);
    } catch (err) {
      console.error(err);
      addToast('Auto-save failed', 'error');
    }
  };

  // Quick 1-tap mode toggle (Cash <-> Google Pay)
  const handleToggleMode = async (member: Member, month: string) => {
    const key = `${member.memberNo}_${month}`;
    const existingDoc = yearCollectionsMap[key];
    const rawVal = getCellValue(member.memberNo, month);
    const amt = parseFloat(rawVal) || 0;

    const currentMode = existingDoc?.paymentMode || 'Google Pay';
    const nextMode: 'Cash' | 'Google Pay' = currentMode === 'Google Pay' ? 'Cash' : 'Google Pay';

    const colObj: ColType = {
      id: `${member.memberNo}_${selectedYear}_${month}`,
      memberNo: member.memberNo,
      memberName: member.memberName,
      year: selectedYear,
      month: month,
      amount: amt,
      status: amt > 0 ? 'Paid' : 'Pending',
      remarks: existingDoc?.remarks || '',
      paymentMode: nextMode,
      updatedAt: Date.now()
    };

    try {
      await saveMonthlyCollection(colObj);
      addToast(`${month} mode: ${nextMode} (${member.memberName})`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to update mode', 'error');
    }
  };

  // Clear entire row for a member in this financial year
  const handleClearMemberYear = async (member: Member) => {
    const memberDocs = MONTHS.map((m) => yearCollectionsMap[`${member.memberNo}_${m}`]).filter(Boolean);

    if (memberDocs.length === 0) {
      addToast('No entries found for this member.', 'info');
      return;
    }

    try {
      for (const d of memberDocs) {
        await deleteMonthlyCollection(d.id);
      }
      setEditBuffer((prev) => {
        const next = { ...prev };
        MONTHS.forEach((m) => {
          delete next[`${member.memberNo}_${m}`];
        });
        return next;
      });
      addToast(`Cleared ${selectedYear} records for ${member.memberName}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to clear records', 'error');
    }
  };

  // Filter members list based on active status and search
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const hasAnyDoc = MONTHS.some((mo) => !!yearCollectionsMap[`${m.memberNo}_${mo}`]);
      const matchesActive = m.status === 'Active' || hasAnyDoc;
      const matchesSearch =
        m.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.memberNo.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesActive && matchesSearch;
    });
  }, [members, yearCollectionsMap, searchTerm]);

  // Flush all pending unsaved typing edits immediately
  const flushDirtyCells = async () => {
    const entries = Object.entries(editBuffer);
    if (entries.length === 0) return;
    for (const [key, val] of entries) {
      const [mNo, mo] = key.split('_');
      const memberObj = members.find((m) => m.memberNo === mNo);
      if (memberObj) {
        await handleSaveCell(memberObj, mo);
      }
    }
  };

  // Month navigation handlers (auto wraps year when moving past April or May)
  const handlePrevMonth = async () => {
    await flushDirtyCells();
    const currentIndex = MONTHS.indexOf(selectedMonth);
    if (currentIndex > 0) {
      setSelectedMonth(MONTHS[currentIndex - 1]);
    } else {
      const yearIndex = YEARS.indexOf(selectedYear);
      if (yearIndex > 0) {
        setSelectedYear(YEARS[yearIndex - 1]);
        setSelectedMonth(MONTHS[MONTHS.length - 1]);
      }
    }
  };

  const handleNextMonth = async () => {
    await flushDirtyCells();
    const currentIndex = MONTHS.indexOf(selectedMonth);
    if (currentIndex < MONTHS.length - 1) {
      setSelectedMonth(MONTHS[currentIndex + 1]);
    } else {
      const yearIndex = YEARS.indexOf(selectedYear);
      if (yearIndex < YEARS.length - 1) {
        setSelectedYear(YEARS[yearIndex + 1]);
        setSelectedMonth(MONTHS[0]);
      }
    }
  };

  // Calculate live column totals and grand totals
  const columnTotals = useMemo(() => {
    const totals: { [month: string]: number } = {};
    let grand = 0;

    MONTHS.forEach((m) => {
      let monthSum = 0;
      filteredMembers.forEach((member) => {
        const val = getCellValue(member.memberNo, m);
        const parsed = parseFloat(val) || 0;
        monthSum += parsed;
      });
      totals[m] = monthSum;
      grand += monthSum;
    });

    return { monthly: totals, grand };
  }, [filteredMembers, editBuffer, yearCollectionsMap]);

  // Calculate each member's row total for selected year
  const getMemberRowTotal = (memberNo: string): number => {
    return MONTHS.reduce((sum, m) => {
      const val = getCellValue(memberNo, m);
      return sum + (parseFloat(val) || 0);
    }, 0);
  };

  // Key navigation for fast matrix spreadsheet typing
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    member: Member,
    monthIndex: number,
    memberIndex: number
  ) => {
    const month = MONTHS[monthIndex];
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveCell(member, month);
      // Move to same month of next member
      const nextMember = filteredMembers[memberIndex + 1];
      if (nextMember) {
        const nextInput = document.getElementById(`matrix-cell-${nextMember.memberNo}-${month}`);
        nextInput?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      const nextMember = filteredMembers[memberIndex + 1];
      if (nextMember) {
        e.preventDefault();
        handleSaveCell(member, month);
        const nextInput = document.getElementById(`matrix-cell-${nextMember.memberNo}-${month}`);
        nextInput?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      const prevMember = filteredMembers[memberIndex - 1];
      if (prevMember) {
        e.preventDefault();
        handleSaveCell(member, month);
        const prevInput = document.getElementById(`matrix-cell-${prevMember.memberNo}-${month}`);
        prevInput?.focus();
      }
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <CheckSquare className="w-5 h-5" />
            </span>
            Monthly Collection Matrix
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Type amounts directly into any month's cell — auto-saves instantly on typing.
          </p>
        </div>

        {/* Grand Total display card */}
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-3.5 sm:p-4 flex items-center gap-4 shrink-0 shadow-xs">
          <div className="p-2.5 sm:p-3 bg-emerald-600 text-white rounded-xl">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold uppercase tracking-wider">
              {viewMode === 'single' ? `${selectedMonth} ${selectedYear} Collection` : `${selectedYear} Total Collection`}
            </p>
            <h2 className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300">
              ₹{(viewMode === 'single' ? columnTotals.monthly[selectedMonth] || 0 : columnTotals.grand).toLocaleString('en-IN')}
            </h2>
            {viewMode === 'single' && (
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                Annual Year Total: ₹{columnTotals.grand.toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Control Bar: Year selector, View toggle, & Search */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col md:flex-row gap-3 sm:gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          {/* Select Year */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Year:</span>
            <select
              value={selectedYear}
              onChange={async (e) => {
                const val = e.target.value;
                await flushDirtyCells();
                setSelectedYear(val);
              }}
              className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold cursor-pointer"
              id="collection-year-selector"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-700">
            <button
              onClick={() => setViewMode('single')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'single'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
              }`}
              id="collection-single-mode-btn"
            >
              <Columns className="w-3.5 h-3.5" />
              Single Month
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
              }`}
              id="collection-matrix-mode-btn"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              12-Month Matrix
            </button>
          </div>

          {/* If single month mode, show month dropdown with prev/next buttons */}
          {viewMode === 'single' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Month:</span>
              <div className="flex items-center gap-0.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-0.5 shadow-xs">
                <button
                  onClick={handlePrevMonth}
                  type="button"
                  className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                  title="Previous Month"
                  id="prev-month-btn"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <select
                  value={selectedMonth}
                  onChange={async (e) => {
                    const val = e.target.value;
                    await flushDirtyCells();
                    setSelectedMonth(val);
                  }}
                  className="px-2 py-1 bg-transparent text-zinc-800 dark:text-zinc-100 focus:outline-none text-xs font-bold cursor-pointer"
                  id="collection-month-selector"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m} className="bg-white dark:bg-zinc-800">
                      {m}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleNextMonth}
                  type="button"
                  className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                  title="Next Month"
                  id="next-month-btn"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Member Search filter */}
        <div className="relative w-full md:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            placeholder="Search member name or no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 sm:py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
            id="collection-search-input"
          />
        </div>
      </div>

      {/* Typing Guide Tip */}
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            <strong>Typing Method:</strong> Enter amount in any cell. Press <strong>Enter / Tab / Arrow Down</strong> or click away to auto-save.
          </span>
        </div>
        <span className="hidden sm:inline font-mono text-[11px] text-zinc-400">
          Showing {filteredMembers.length} members
        </span>
      </div>

      {/* 12-MONTH MATRIX VIEW */}
      {viewMode === 'matrix' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto smooth-scroll">
            <table className="w-full text-left border-collapse text-xs" id="monthly-matrix-table">
              <thead>
                <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider">
                  <th className="px-3.5 py-3.5 w-14 sticky left-0 z-20 bg-zinc-50 dark:bg-zinc-900 shadow-r">No.</th>
                  <th className="px-3.5 py-3.5 min-w-[140px] sticky left-14 z-20 bg-zinc-50 dark:bg-zinc-900 shadow-r">Member Name</th>
                  {MONTH_SHORT.map((m, idx) => (
                    <th key={m} className="px-2 py-3.5 min-w-[82px] text-center">
                      <div className="font-bold">{m}</div>
                      <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-normal mt-0.5">
                        ₹{(columnTotals.monthly[MONTHS[idx]] || 0).toLocaleString('en-IN')}
                      </div>
                    </th>
                  ))}
                  <th className="px-3.5 py-3.5 min-w-[90px] text-center bg-emerald-50/50 dark:bg-emerald-950/20 font-extrabold text-emerald-800 dark:text-emerald-300">
                    Total (₹)
                  </th>
                  <th className="px-2.5 py-3.5 w-12 text-center">Reset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-sans">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="text-center py-12 text-zinc-400 font-medium">
                      No active members found.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member, memberIdx) => {
                    const memberTotal = getMemberRowTotal(member.memberNo);

                    return (
                      <tr
                        key={member.memberNo}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors"
                      >
                        {/* Member No (Sticky left) */}
                        <td className="px-3.5 py-2 font-mono font-bold text-zinc-900 dark:text-zinc-100 sticky left-0 z-10 bg-white dark:bg-zinc-900">
                          {member.memberNo}
                        </td>

                        {/* Member Name (Sticky left) */}
                        <td className="px-3.5 py-2 font-semibold text-zinc-800 dark:text-zinc-200 sticky left-14 z-10 bg-white dark:bg-zinc-900 truncate max-w-[150px]">
                          {member.memberName}
                          {member.status === 'Inactive' && (
                            <span className="ml-1 text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-400 px-1 py-0.5 rounded">
                              Off
                            </span>
                          )}
                        </td>

                        {/* 12 Months Direct Typing Inputs */}
                        {MONTHS.map((month, monthIdx) => {
                          const cellVal = getCellValue(member.memberNo, month);
                          const cellMode = getCellMode(member.memberNo, month);
                          const isDirty = editBuffer[`${member.memberNo}_${month}`] !== undefined;
                          const hasValue = parseFloat(cellVal) > 0;

                          return (
                            <td key={month} className="px-1 py-1.5 text-center">
                              <div className="relative flex flex-col items-center gap-0.5">
                                <input
                                  key={`matrix-input-${member.memberNo}-${selectedYear}-${month}`}
                                  id={`matrix-cell-${member.memberNo}-${month}`}
                                  type="text"
                                  inputMode="numeric"
                                  value={cellVal}
                                  placeholder="—"
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => handleCellType(member.memberNo, month, e.target.value)}
                                  onBlur={() => handleSaveCell(member, month)}
                                  onKeyDown={(e) => handleKeyDown(e, member, monthIdx, memberIdx)}
                                  className={`w-full text-center px-1.5 py-1.5 rounded-lg font-mono font-black text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all border cursor-text placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-950 dark:text-white ${
                                    isDirty
                                      ? 'bg-white dark:bg-zinc-800 border-emerald-500 ring-1 ring-emerald-500'
                                      : hasValue
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700'
                                      : 'bg-zinc-50 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700'
                                  }`}
                                />
                                {hasValue && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMode(member, month)}
                                    title={`Payment Mode: ${cellMode} (Tap to toggle)`}
                                    className={`text-[8px] font-bold px-1 py-0.2 rounded leading-tight transition-colors cursor-pointer ${
                                      cellMode === 'Google Pay'
                                        ? 'text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40'
                                        : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                    }`}
                                  >
                                    {cellMode === 'Google Pay' ? 'GPay' : 'Cash'}
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Member Total Paid */}
                        <td className="px-3.5 py-2 text-center font-bold font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50/30 dark:bg-emerald-950/10">
                          ₹{memberTotal.toLocaleString('en-IN')}
                        </td>

                        {/* Row Reset */}
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => handleClearMemberYear(member)}
                            className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                            title={`Clear all ${selectedYear} records for ${member.memberName}`}
                            id={`matrix-clear-row-${member.memberNo}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Footer row with Totals */}
              <tfoot>
                <tr className="border-t-2 border-zinc-300 dark:border-zinc-700 bg-zinc-100/70 dark:bg-zinc-800/60 font-bold text-zinc-800 dark:text-zinc-100">
                  <td colSpan={2} className="px-3.5 py-3 sticky left-0 z-20 bg-zinc-100 dark:bg-zinc-800 font-extrabold uppercase text-[11px]">
                    Total
                  </td>
                  {MONTHS.map((m) => (
                    <td key={m} className="px-1 py-3 text-center font-mono text-emerald-700 dark:text-emerald-300 font-extrabold text-[11px]">
                      ₹{(columnTotals.monthly[m] || 0).toLocaleString('en-IN')}
                    </td>
                  ))}
                  <td className="px-3.5 py-3 text-center font-mono text-emerald-800 dark:text-emerald-200 font-black text-xs bg-emerald-100/60 dark:bg-emerald-900/40">
                    ₹{columnTotals.grand.toLocaleString('en-IN')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* SINGLE MONTH QUICK TYPING VIEW */}
      {viewMode === 'single' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="single-month-table">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400 dark:text-zinc-500 text-xs uppercase font-bold tracking-wider">
                  <th className="px-6 py-4 w-20">No.</th>
                  <th className="px-6 py-4 w-52">Member Name</th>
                  <th className="px-6 py-4 w-44">Amount for {selectedMonth} (₹)</th>
                  <th className="px-6 py-4 w-36 text-center">Payment Mode</th>
                  <th className="px-6 py-4 w-36 text-center">{selectedYear} Paid Total</th>
                  <th className="px-6 py-4 w-24 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-zinc-400 font-medium">
                      No active members found.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member, memberIdx) => {
                    const cellVal = getCellValue(member.memberNo, selectedMonth);
                    const cellMode = getCellMode(member.memberNo, selectedMonth);
                    const isDirty = editBuffer[`${member.memberNo}_${selectedMonth}`] !== undefined;
                    const hasValue = parseFloat(cellVal) > 0;
                    const yearTotal = getMemberRowTotal(member.memberNo);

                    return (
                      <tr
                        key={member.memberNo}
                        className={`hover:bg-zinc-50/40 dark:hover:bg-zinc-800/20 transition-colors ${
                          hasValue ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''
                        }`}
                      >
                        {/* Member No */}
                        <td className="px-6 py-3.5 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {member.memberNo}
                        </td>

                        {/* Member Name */}
                        <td className="px-6 py-3.5 font-bold text-zinc-800 dark:text-zinc-200">
                          {member.memberName}
                          {member.status === 'Inactive' && (
                            <span className="ml-2 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Direct Amount Input */}
                        <td className="px-6 py-3.5">
                          <input
                            key={`single-input-${member.memberNo}-${selectedYear}-${selectedMonth}`}
                            id={`single-cell-${member.memberNo}`}
                            type="text"
                            inputMode="numeric"
                            value={cellVal}
                            placeholder="Type amount..."
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleCellType(member.memberNo, selectedMonth, e.target.value)}
                            onBlur={() => handleSaveCell(member, selectedMonth)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveCell(member, selectedMonth);
                                const nextMember = filteredMembers[memberIdx + 1];
                                if (nextMember) {
                                  document.getElementById(`single-cell-${nextMember.memberNo}`)?.focus();
                                }
                              }
                            }}
                            className={`w-full px-3 py-2 bg-white dark:bg-zinc-800 border rounded-xl text-sm font-black font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 ${
                              isDirty
                                ? 'border-emerald-500 ring-1 ring-emerald-500'
                                : hasValue
                                ? 'border-emerald-400 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30'
                                : 'border-zinc-200 dark:border-zinc-700'
                            }`}
                          />
                        </td>

                        {/* 1-Tap Mode Toggle */}
                        <td className="px-6 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleMode(member, selectedMonth)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              cellMode === 'Google Pay'
                                ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            }`}
                          >
                            {cellMode}
                          </button>
                        </td>

                        {/* Member Year Total Paid */}
                        <td className="px-6 py-3.5 text-center font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                          ₹{yearTotal.toLocaleString('en-IN')}
                        </td>

                        {/* Clear Action */}
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => {
                              handleCellType(member.memberNo, selectedMonth, '');
                              const doc = yearCollectionsMap[`${member.memberNo}_${selectedMonth}`];
                              if (doc) deleteMonthlyCollection(doc.id);
                            }}
                            className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer"
                            title="Clear this month"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
