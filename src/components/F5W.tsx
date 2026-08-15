import React, { useState, useMemo } from 'react';
import {
  Coins,
  Search,
  Trash2,
  HelpCircle,
  TrendingUp,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  Sparkles,
  LayoutGrid,
  Columns
} from 'lucide-react';
import { Member, F5WCollection } from '../types';
import { saveF5W, deleteF5W } from '../firebase';

interface F5WProps {
  members: Member[];
  f5wData: F5WCollection[];
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

const YEARS = ['2025-2026', '2026-2027', '2027-2028', '2028-2029'];
type WeekKey = 'col1' | 'col2' | 'col3' | 'col4' | 'col5';

const WEEKS: { key: WeekKey; label: string; short: string }[] = [
  { key: 'col1', label: 'Week 1 (W1)', short: 'W1' },
  { key: 'col2', label: 'Week 2 (W2)', short: 'W2' },
  { key: 'col3', label: 'Week 3 (W3)', short: 'W3' },
  { key: 'col4', label: 'Week 4 (W4)', short: 'W4' },
  { key: 'col5', label: 'Week 5 (W5)', short: 'W5' }
];

export default function F5W({
  members,
  f5wData,
  addToast
}: F5WProps) {
  const [selectedYear, setSelectedYear] = useState('2026-2027');
  const [selectedWeek, setSelectedWeek] = useState<'all' | WeekKey>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Local editing buffer to make typing responsive: { [memberNo]: { col1, col2, col3, col4, col5 } }
  const [editBuffer, setEditBuffer] = useState<{
    [memberNo: string]: {
      col1: string;
      col2: string;
      col3: string;
      col4: string;
      col5: string;
    };
  }>({});

  // Reset editing buffer when changing year
  React.useEffect(() => {
    setEditBuffer({});
  }, [selectedYear]);

  // Map F5W collection documents for the selected year
  const currentF5WMap = useMemo(() => {
    const map: { [memberNo: string]: F5WCollection } = {};
    f5wData.forEach((d) => {
      if (d.year === selectedYear) {
        map[d.memberNo] = d;
      }
    });
    return map;
  }, [f5wData, selectedYear]);

  // Get active cell values (buffer values falling back to DB, then empty)
  const getRowValues = (memberNo: string) => {
    const existing = currentF5WMap[memberNo];
    const buffer = editBuffer[memberNo];

    if (buffer) {
      return {
        col1: buffer.col1,
        col2: buffer.col2,
        col3: buffer.col3,
        col4: buffer.col4,
        col5: buffer.col5,
        isDirty: true
      };
    }

    return {
      col1: existing && existing.col1 > 0 ? existing.col1.toString() : '',
      col2: existing && existing.col2 > 0 ? existing.col2.toString() : '',
      col3: existing && existing.col3 > 0 ? existing.col3.toString() : '',
      col4: existing && existing.col4 > 0 ? existing.col4.toString() : '',
      col5: existing && existing.col5 > 0 ? existing.col5.toString() : '',
      isDirty: false
    };
  };

  // Handle local typing changes in a cell
  const handleCellChange = (memberNo: string, colKey: WeekKey, value: string) => {
    const existingRow = getRowValues(memberNo);
    const updated = {
      col1: existingRow.col1,
      col2: existingRow.col2,
      col3: existingRow.col3,
      col4: existingRow.col4,
      col5: existingRow.col5,
      [colKey]: value
    };

    setEditBuffer((prev) => ({
      ...prev,
      [memberNo]: updated
    }));
  };

  // Auto save row to Firestore
  const handleAutoSave = async (member: Member, rowValues: { col1: string; col2: string; col3: string; col4: string; col5: string }) => {
    const c1 = parseFloat(rowValues.col1) || 0;
    const c2 = parseFloat(rowValues.col2) || 0;
    const c3 = parseFloat(rowValues.col3) || 0;
    const c4 = parseFloat(rowValues.col4) || 0;
    const c5 = parseFloat(rowValues.col5) || 0;

    const existing = currentF5WMap[member.memberNo];

    // If all 5 columns are 0 and existing doc exists, delete it so clean reset works
    if (c1 === 0 && c2 === 0 && c3 === 0 && c4 === 0 && c5 === 0) {
      if (existing) {
        try {
          await deleteF5W(existing.id);
          setEditBuffer((prev) => {
            const copy = { ...prev };
            delete copy[member.memberNo];
            return copy;
          });
        } catch (err) {
          console.error(err);
        }
      } else {
        setEditBuffer((prev) => {
          const copy = { ...prev };
          delete copy[member.memberNo];
          return copy;
        });
      }
      return;
    }

    const f5wObj: F5WCollection = {
      id: `${member.memberNo}_${selectedYear}`,
      memberNo: member.memberNo,
      memberName: member.memberName,
      year: selectedYear,
      col1: c1,
      col2: c2,
      col3: c3,
      col4: c4,
      col5: c5,
      col1Mode: existing?.col1Mode || 'Google Pay',
      col2Mode: existing?.col2Mode || 'Google Pay',
      col3Mode: existing?.col3Mode || 'Google Pay',
      col4Mode: existing?.col4Mode || 'Google Pay',
      col5Mode: existing?.col5Mode || 'Google Pay',
      updatedAt: Date.now()
    };

    try {
      await saveF5W(f5wObj);
      // Remove from local edit buffer since it's saved in Firestore
      setEditBuffer((prev) => {
        const copy = { ...prev };
        delete copy[member.memberNo];
        return copy;
      });
    } catch (err) {
      console.error(err);
      addToast('Auto-save failed', 'error');
    }
  };

  // Toggle payment mode for a column and save immediately
  const handleToggleMode = async (member: Member, colKey: WeekKey) => {
    const existing = currentF5WMap[member.memberNo];
    const rowValues = getRowValues(member.memberNo);

    const c1 = parseFloat(rowValues.col1) || 0;
    const c2 = parseFloat(rowValues.col2) || 0;
    const c3 = parseFloat(rowValues.col3) || 0;
    const c4 = parseFloat(rowValues.col4) || 0;
    const c5 = parseFloat(rowValues.col5) || 0;

    const currentModeKey = `${colKey}Mode` as const;
    const currentMode = existing?.[currentModeKey] || 'Google Pay';
    const nextMode = currentMode === 'Google Pay' ? 'Cash' : 'Google Pay';

    const f5wObj: F5WCollection = {
      id: `${member.memberNo}_${selectedYear}`,
      memberNo: member.memberNo,
      memberName: member.memberName,
      year: selectedYear,
      col1: c1,
      col2: c2,
      col3: c3,
      col4: c4,
      col5: c5,
      col1Mode: existing?.col1Mode || 'Google Pay',
      col2Mode: existing?.col2Mode || 'Google Pay',
      col3Mode: existing?.col3Mode || 'Google Pay',
      col4Mode: existing?.col4Mode || 'Google Pay',
      col5Mode: existing?.col5Mode || 'Google Pay',
      [currentModeKey]: nextMode,
      updatedAt: Date.now()
    };

    try {
      await saveF5W(f5wObj);
      addToast(`Updated Week ${colKey.replace('col', '')} mode to ${nextMode} for ${member.memberName}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to update payment mode', 'error');
    }
  };

  // Clear a member's custom row (resets back to 0)
  const handleClearRow = async (member: Member) => {
    const existing = currentF5WMap[member.memberNo];
    if (!existing) {
      addToast('Row is already at default values.', 'info');
      return;
    }

    try {
      await deleteF5W(existing.id);
      addToast(`F5W record reset for ${member.memberName}`, 'success');

      // Clear any buffer
      setEditBuffer((prev) => {
        const copy = { ...prev };
        delete copy[member.memberNo];
        return copy;
      });
    } catch (err) {
      console.error(err);
      addToast('Failed to reset record', 'error');
    }
  };

  // Stepper handlers for week navigation
  const handlePrevWeek = () => {
    if (selectedWeek === 'all') {
      setSelectedWeek('col5');
    } else {
      const idx = WEEKS.findIndex((w) => w.key === selectedWeek);
      if (idx > 0) {
        setSelectedWeek(WEEKS[idx - 1].key);
      } else {
        setSelectedWeek('all');
      }
    }
  };

  const handleNextWeek = () => {
    if (selectedWeek === 'all') {
      setSelectedWeek('col1');
    } else {
      const idx = WEEKS.findIndex((w) => w.key === selectedWeek);
      if (idx < WEEKS.length - 1) {
        setSelectedWeek(WEEKS[idx + 1].key);
      } else {
        setSelectedWeek('all');
      }
    }
  };

  // Filter members list based on active state and search term
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const hasRecord = !!currentF5WMap[m.memberNo];
      const matchesActive = m.status === 'Active' || hasRecord;

      const matchesSearch =
        m.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.memberNo.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesActive && matchesSearch;
    });
  }, [members, currentF5WMap, searchTerm]);

  // Calculate live column and overall totals
  const totals = useMemo(() => {
    let t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0;
    
    filteredMembers.forEach((m) => {
      const row = getRowValues(m.memberNo);
      t1 += parseFloat(row.col1) || 0;
      t2 += parseFloat(row.col2) || 0;
      t3 += parseFloat(row.col3) || 0;
      t4 += parseFloat(row.col4) || 0;
      t5 += parseFloat(row.col5) || 0;
    });

    const grand = t1 + t2 + t3 + t4 + t5;

    return { col1: t1, col2: t2, col3: t3, col4: t4, col5: t5, grand };
  }, [filteredMembers, editBuffer, currentF5WMap]);

  // Active view total based on selection
  const activeViewTotal = useMemo(() => {
    if (selectedWeek === 'all') return totals.grand;
    return totals[selectedWeek] || 0;
  }, [selectedWeek, totals]);

  const activeWeekLabel = useMemo(() => {
    if (selectedWeek === 'all') return 'All Weeks (W1-W5)';
    return WEEKS.find((w) => w.key === selectedWeek)?.label || 'Week';
  }, [selectedWeek]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <Coins className="w-5 h-5" />
            </span>
            F5W Ledger Matrix
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage F5W collection matrix with 5 customizable week amount columns per member.
          </p>
        </div>

        {/* Grand Total Cards */}
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-3.5 sm:p-4 flex items-center gap-4 shrink-0 shadow-xs">
          <div className="p-2.5 sm:p-3 bg-emerald-600 text-white rounded-xl">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold uppercase tracking-wider">
              {selectedYear} {activeWeekLabel} Total
            </p>
            <h2 className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300">
              ₹{activeViewTotal.toLocaleString('en-IN')}
            </h2>
            {selectedWeek !== 'all' && (
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                All 5 Weeks Total: ₹{totals.grand.toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Selectors and search filter bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col md:flex-row gap-3 sm:gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          {/* Select Year */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold cursor-pointer"
              id="f5w-year-selector"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Week Dropdown Selector (W1, W2, W3, W4, W5, All) */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Week:</span>
            <div className="flex items-center gap-0.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-0.5 shadow-xs">
              <button
                onClick={handlePrevWeek}
                type="button"
                className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                title="Previous Week"
                id="f5w-prev-week-btn"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value as 'all' | WeekKey)}
                className="px-2 py-1 bg-transparent text-zinc-800 dark:text-zinc-100 focus:outline-none text-xs font-bold cursor-pointer"
                id="f5w-week-dropdown"
              >
                <option value="all" className="bg-white dark:bg-zinc-800">
                  All Weeks (W1 - W5 Matrix)
                </option>
                {WEEKS.map((w) => (
                  <option key={w.key} value={w.key} className="bg-white dark:bg-zinc-800">
                    {w.label}
                  </option>
                ))}
              </select>

              <button
                onClick={handleNextWeek}
                type="button"
                className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                title="Next Week"
                id="f5w-next-week-btn"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
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
            id="f5w-search-input"
          />
        </div>
      </div>

      {/* Live status tips */}
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            <strong>Typing Method:</strong> Enter amount in any cell. Press <strong>Enter</strong> or click away to auto-save.
          </span>
        </div>
        <span className="hidden sm:inline font-mono text-[11px] text-zinc-400">
          Showing {filteredMembers.length} members
        </span>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {/* ALL WEEKS (FULL MATRIX VIEW) */}
          {selectedWeek === 'all' ? (
            <table className="w-full text-left border-collapse" id="f5w-matrix-table">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400 dark:text-zinc-500 text-xs uppercase font-bold tracking-wider">
                  <th className="px-6 py-4 w-20">No.</th>
                  <th className="px-6 py-4 w-44">Member Name</th>
                  {WEEKS.map((w) => (
                    <th key={w.key} className="px-4 py-4 w-28 text-center">
                      <div>{w.short} (₹)</div>
                      <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-normal mt-0.5">
                        ₹{totals[w.key].toLocaleString('en-IN')}
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-4 w-32 text-center bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-extrabold">
                    Total Paid
                  </th>
                  <th className="px-6 py-4 w-20 text-right">Reset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-zinc-400 font-medium animate-pulse">
                      No active members found.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member, memberIdx) => {
                    const row = getRowValues(member.memberNo);
                    const w1 = parseFloat(row.col1) || 0;
                    const w2 = parseFloat(row.col2) || 0;
                    const w3 = parseFloat(row.col3) || 0;
                    const w4 = parseFloat(row.col4) || 0;
                    const w5 = parseFloat(row.col5) || 0;
                    const memberRowTotal = w1 + w2 + w3 + w4 + w5;

                    return (
                      <tr
                        key={member.memberNo}
                        className="hover:bg-zinc-50/30 dark:hover:bg-zinc-800/10 transition-colors"
                      >
                        {/* No. */}
                        <td className="px-6 py-3.5 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {member.memberNo}
                        </td>

                        {/* Name */}
                        <td className="px-6 py-3.5 font-bold text-zinc-800 dark:text-zinc-200">
                          <div className="flex flex-col">
                            <span>{member.memberName}</span>
                            {member.status === 'Inactive' && (
                              <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded w-max mt-0.5 font-normal">
                                Inactive
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5 Column Inputs */}
                        {WEEKS.map((w, weekIdx) => {
                          const colKey = w.key;
                          const existingDoc = currentF5WMap[member.memberNo];
                          const mode = existingDoc ? (existingDoc[`${colKey}Mode` as const] || 'Google Pay') : 'Google Pay';
                          const hasVal = parseFloat(row[colKey]) > 0;

                          return (
                            <td key={colKey} className="px-3 py-2.5 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={row[colKey]}
                                  onFocus={(e) => e.currentTarget.select()}
                                  onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
                                  onChange={(e) => handleCellChange(member.memberNo, colKey, e.target.value)}
                                  onBlur={() => handleAutoSave(member, getRowValues(member.memberNo))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAutoSave(member, getRowValues(member.memberNo));
                                      const nextMember = filteredMembers[memberIdx + 1];
                                      if (nextMember) {
                                        document.getElementById(`f5w-input-${nextMember.memberNo}-${colKey}`)?.focus();
                                      }
                                    }
                                  }}
                                  className={`w-full px-2 py-1.5 border rounded-lg text-xs font-bold font-mono text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-text ${
                                    hasVal
                                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                                      : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100'
                                  }`}
                                  placeholder="—"
                                  id={`f5w-input-${member.memberNo}-${colKey}`}
                                />
                                {hasVal && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMode(member, colKey)}
                                    className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border cursor-pointer select-none transition-all ${
                                      mode === 'Google Pay'
                                        ? 'bg-blue-50 text-blue-600 border-blue-200/50 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40'
                                        : 'bg-emerald-50 text-emerald-600 border-emerald-200/50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40'
                                    }`}
                                    title={`Click to toggle payment mode`}
                                    id={`f5w-mode-btn-${member.memberNo}-${colKey}`}
                                  >
                                    {mode === 'Google Pay' ? 'GPay' : 'Cash'}
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Member Total Paid */}
                        <td className="px-6 py-3.5 text-center font-bold text-emerald-700 dark:text-emerald-300 font-mono text-xs bg-emerald-50/20 dark:bg-emerald-950/10">
                          ₹{memberRowTotal.toLocaleString('en-IN')}
                        </td>

                        {/* Action buttons */}
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => handleClearRow(member)}
                            className="p-1.5 bg-zinc-50 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                            title="Reset row to 0"
                            id={`f5w-reset-row-btn-${member.memberNo}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Sum Totals Row */}
              {filteredMembers.length > 0 && (
                <tfoot>
                  <tr className="bg-zinc-100/70 dark:bg-zinc-800/60 font-bold border-t-2 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-xs">
                    <td colSpan={2} className="px-6 py-4 uppercase tracking-wider font-extrabold text-zinc-500 dark:text-zinc-400">
                      Columns Sum
                    </td>
                    {WEEKS.map((w) => (
                      <td key={w.key} className="px-4 py-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{totals[w.key].toLocaleString('en-IN')}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-center font-mono font-extrabold text-emerald-700 dark:text-emerald-300 text-sm bg-emerald-100/50 dark:bg-emerald-950/40">
                      ₹{totals.grand.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          ) : (
            /* SINGLE WEEK VIEW */
            <table className="w-full text-left border-collapse" id="f5w-single-week-table">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400 dark:text-zinc-500 text-xs uppercase font-bold tracking-wider">
                  <th className="px-6 py-4 w-20">No.</th>
                  <th className="px-6 py-4 w-52">Member Name</th>
                  <th className="px-6 py-4 w-44">
                    {activeWeekLabel} Amount (₹)
                  </th>
                  <th className="px-6 py-4 w-36 text-center">Payment Mode</th>
                  <th className="px-6 py-4 w-36 text-center">{selectedYear} Total Paid (5W)</th>
                  <th className="px-6 py-4 w-24 text-right">Reset</th>
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
                    const row = getRowValues(member.memberNo);
                    const val = row[selectedWeek];
                    const existingDoc = currentF5WMap[member.memberNo];
                    const mode = existingDoc ? (existingDoc[`${selectedWeek}Mode` as const] || 'Google Pay') : 'Google Pay';
                    const hasVal = parseFloat(val) > 0;

                    const w1 = parseFloat(row.col1) || 0;
                    const w2 = parseFloat(row.col2) || 0;
                    const w3 = parseFloat(row.col3) || 0;
                    const w4 = parseFloat(row.col4) || 0;
                    const w5 = parseFloat(row.col5) || 0;
                    const memberRowTotal = w1 + w2 + w3 + w4 + w5;

                    return (
                      <tr
                        key={member.memberNo}
                        className={`hover:bg-zinc-50/40 dark:hover:bg-zinc-800/20 transition-colors ${
                          hasVal ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''
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

                        {/* Direct Amount Input for Selected Week */}
                        <td className="px-6 py-3.5">
                          <input
                            id={`f5w-single-cell-${member.memberNo}`}
                            type="number"
                            inputMode="numeric"
                            value={val}
                            placeholder="Type amount..."
                            onFocus={(e) => e.currentTarget.select()}
                            onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
                            onChange={(e) => handleCellChange(member.memberNo, selectedWeek, e.target.value)}
                            onBlur={() => handleAutoSave(member, getRowValues(member.memberNo))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAutoSave(member, getRowValues(member.memberNo));
                                const nextMember = filteredMembers[memberIdx + 1];
                                if (nextMember) {
                                  document.getElementById(`f5w-single-cell-${nextMember.memberNo}`)?.focus();
                                }
                              }
                            }}
                            className={`w-full px-3 py-2 border rounded-xl text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100 cursor-text ${
                              hasVal
                                ? 'border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                                : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                            }`}
                          />
                        </td>

                        {/* 1-Tap Mode Toggle */}
                        <td className="px-6 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleMode(member, selectedWeek)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              mode === 'Google Pay'
                                ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            }`}
                          >
                            {mode}
                          </button>
                        </td>

                        {/* Member Total 5W Paid */}
                        <td className="px-6 py-3.5 text-center font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                          ₹{memberRowTotal.toLocaleString('en-IN')}
                        </td>

                        {/* Clear / Reset Action */}
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => {
                              handleCellChange(member.memberNo, selectedWeek, '');
                              handleAutoSave(member, {
                                ...getRowValues(member.memberNo),
                                [selectedWeek]: ''
                              });
                            }}
                            className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer"
                            title={`Clear ${activeWeekLabel}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Single Week Footer Totals */}
              {filteredMembers.length > 0 && (
                <tfoot>
                  <tr className="bg-zinc-100/70 dark:bg-zinc-800/60 font-bold border-t-2 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 text-xs">
                    <td colSpan={2} className="px-6 py-4 uppercase tracking-wider font-extrabold text-zinc-500 dark:text-zinc-400">
                      {activeWeekLabel} Total
                    </td>
                    <td className="px-6 py-4 font-mono font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">
                      ₹{totals[selectedWeek].toLocaleString('en-IN')}
                    </td>
                    <td></td>
                    <td className="px-6 py-4 text-center font-mono font-extrabold text-emerald-800 dark:text-emerald-200 text-sm bg-emerald-100/50 dark:bg-emerald-950/40">
                      ₹{totals.grand.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
