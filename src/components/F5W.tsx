import React, { useState, useMemo } from 'react';
import {
  Coins,
  Search,
  Trash2,
  HelpCircle,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  Info
} from 'lucide-react';
import { Member, F5WCollection } from '../types';
import { saveF5W, deleteF5W } from '../firebase';

interface F5WProps {
  members: Member[];
  f5wData: F5WCollection[];
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

const YEARS = ['2025-2026', '2026-2027', '2027-2028', '2028-2029'];
const DEFAULT_AMOUNT = 0;

export default function F5W({
  members,
  f5wData,
  addToast
}: F5WProps) {
  const [selectedYear, setSelectedYear] = useState('2026-2027');
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

  // Get active cell values (buffer values falling back to DB, then default 5500)
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
      col1: existing ? existing.col1.toString() : '',
      col2: existing ? existing.col2.toString() : '',
      col3: existing ? existing.col3.toString() : '',
      col4: existing ? existing.col4.toString() : '',
      col5: existing ? existing.col5.toString() : '',
      isDirty: false
    };
  };

  // Handle local typing changes in a cell
  const handleCellChange = (memberNo: string, colKey: 'col1' | 'col2' | 'col3' | 'col4' | 'col5', value: string) => {
    const existingRow = getRowValues(memberNo);
    const updated = {
      col1: existingRow.col1,
      col2: existingRow.col2,
      col3: existingRow.col3,
      col4: existingRow.col4,
      col5: existingRow.col5,
      [colKey]: value
    };

    setEditBuffer({
      ...editBuffer,
      [memberNo]: updated
    });
  };

  // Auto save row to Firestore
  const handleAutoSave = async (member: Member, rowValues: { col1: string; col2: string; col3: string; col4: string; col5: string }) => {
    const c1 = parseFloat(rowValues.col1) || 0;
    const c2 = parseFloat(rowValues.col2) || 0;
    const c3 = parseFloat(rowValues.col3) || 0;
    const c4 = parseFloat(rowValues.col4) || 0;
    const c5 = parseFloat(rowValues.col5) || 0;

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

  // Clear a member's custom row (resets back to default 5500 per week)
  const handleClearRow = async (member: Member) => {
    const existing = currentF5WMap[member.memberNo];
    if (!existing) {
      addToast('Row is already at default values.', 'info');
      return;
    }

    try {
      await deleteF5W(existing.id);
      addToast(`F5W record reset to default for ${member.memberName}`, 'success');

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

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <Coins className="w-5 h-5" />
            </span>
            F5W Ledger Matrix
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage F5W collection matrix with 5 customizable amount columns per member.
          </p>
        </div>

        {/* Grand Total Cards */}
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 flex items-center gap-4 shrink-0 shadow-xs">
          <div className="p-3 bg-emerald-600 text-white rounded-xl">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold uppercase tracking-wider">
              {selectedYear} F5W Ledger Total
            </p>
            <h2 className="text-xl font-black text-emerald-700 dark:text-emerald-300">
              ₹{totals.grand.toLocaleString('en-IN')}
            </h2>
          </div>
        </div>
      </div>

      {/* Selectors and search filter bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4 rounded-3xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Live status tips */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-400 font-medium">
          <Info className="w-4 h-4 text-emerald-500" />
          <span>Press <strong>Enter</strong> or click outside any cell to automatically save updates.</span>
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
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
            id="f5w-search-input"
          />
        </div>
      </div>

      {/* Grid Matrix Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="f5w-matrix-table">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400 dark:text-zinc-500 text-xs uppercase font-bold tracking-wider">
                <th className="px-6 py-4 w-20">No.</th>
                <th className="px-6 py-4 w-44">Member Name</th>
                <th className="px-4 py-4 w-28 text-center">W1 (₹)</th>
                <th className="px-4 py-4 w-28 text-center">W2 (₹)</th>
                <th className="px-4 py-4 w-28 text-center">W3 (₹)</th>
                <th className="px-4 py-4 w-28 text-center">W4 (₹)</th>
                <th className="px-4 py-4 w-28 text-center">W5 (₹)</th>
                <th className="px-6 py-4 w-32 text-center">Total Paid</th>
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
                filteredMembers.map((member) => {
                  const row = getRowValues(member.memberNo);
                  const w1 = parseFloat(row.col1) || 0;
                  const w2 = parseFloat(row.col2) || 0;
                  const w3 = parseFloat(row.col3) || 0;
                  const w4 = parseFloat(row.col4) || 0;
                  const w5 = parseFloat(row.col5) || 0;
                  const memberRowTotal = w1 + w2 + w3 + w4 + w5;

                  const colKeys: ('col1' | 'col2' | 'col3' | 'col4' | 'col5')[] = ['col1', 'col2', 'col3', 'col4', 'col5'];

                  return (
                    <tr
                      key={member.memberNo}
                      className="hover:bg-zinc-50/30 dark:hover:bg-zinc-800/10 transition-colors"
                    >
                      {/* No. */}
                      <td className="px-6 py-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {member.memberNo}
                      </td>

                      {/* Name */}
                      <td className="px-6 py-4 font-bold text-zinc-800 dark:text-zinc-200">
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
                      {colKeys.map((colKey, index) => (
                        <td key={colKey} className="px-4 py-4">
                          <input
                            type="number"
                            value={row[colKey]}
                            onChange={(e) => handleCellChange(member.memberNo, colKey, e.target.value)}
                            onBlur={() => handleAutoSave(member, getRowValues(member.memberNo))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAutoSave(member, getRowValues(member.memberNo));
                              }
                            }}
                            className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold font-mono text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-800 dark:text-zinc-100"
                            placeholder="0"
                            id={`f5w-input-${member.memberNo}-${colKey}`}
                          />
                        </td>
                      ))}

                      {/* Member Total Paid */}
                      <td className="px-6 py-4 text-center font-bold text-zinc-900 dark:text-zinc-50 font-mono text-xs">
                        ₹{memberRowTotal.toLocaleString('en-IN')}
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleClearRow(member)}
                          className="p-1.5 bg-zinc-50 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                          title="Reset to 0"
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
                <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 font-bold border-t border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 text-xs">
                  <td colSpan={2} className="px-6 py-4 uppercase tracking-wider font-extrabold text-zinc-400">
                    Grand Columns Sum
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{totals.col1.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{totals.col2.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{totals.col3.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{totals.col4.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{totals.col5.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-center font-mono font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">
                    ₹{totals.grand.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
