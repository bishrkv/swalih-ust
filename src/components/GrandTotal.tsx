import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Search,
  Printer,
  FileSpreadsheet,
  TrendingUp,
  Coins,
  CheckSquare,
  ArrowRightLeft,
  Info,
  Calendar,
  Layers,
  Percent
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Member, MonthlyCollection, F5WCollection } from '../types';

interface GrandTotalProps {
  members: Member[];
  collections: MonthlyCollection[];
  f5wData: F5WCollection[];
}

export default function GrandTotal({
  members,
  collections,
  f5wData
}: GrandTotalProps) {
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const YEARS = ['2025-2026', '2026-2027', '2027-2028', '2028-2029'];

  // Calculate Consolidated Metrics based on Year Filter
  const consolidatedMetrics = useMemo(() => {
    // 1. Monthly Collection sum
    const filteredCollections = collections.filter(c => {
      const isPaid = c.status === 'Paid';
      const matchesYear = selectedYear === 'All' || c.year === selectedYear;
      return isPaid && matchesYear;
    });
    const monthlyTotal = filteredCollections.reduce((sum, c) => sum + (c.amount || 0), 0);

    // 2. F5W sum
    const filteredF5W = f5wData.filter(f => selectedYear === 'All' || f.year === selectedYear);
    const f5wTotal = filteredF5W.reduce((sum, f) => {
      const rowSum = (f.col1 || 0) + (f.col2 || 0) + (f.col3 || 0) + (f.col4 || 0) + (f.col5 || 0);
      return sum + rowSum;
    }, 0);

    const grandTotal = monthlyTotal + f5wTotal;

    return {
      monthlyTotal,
      f5wTotal,
      grandTotal
    };
  }, [collections, f5wData, selectedYear]);

  // Compile detailed table rows for members
  const memberAuditRows = useMemo(() => {
    return members
      .map(m => {
        // Monthly collections for this member
        const memberColl = collections
          .filter(c => c.memberNo === m.memberNo && c.status === 'Paid' && (selectedYear === 'All' || c.year === selectedYear))
          .reduce((sum, c) => sum + (c.amount || 0), 0);

        // F5W records for this member
        const memberF5W = f5wData
          .filter(f => f.memberNo === m.memberNo && (selectedYear === 'All' || f.year === selectedYear))
          .reduce((sum, f) => {
            return sum + (f.col1 || 0) + (f.col2 || 0) + (f.col3 || 0) + (f.col4 || 0) + (f.col5 || 0);
          }, 0);

        const totalPaid = memberColl + memberF5W;

        return {
          memberNo: m.memberNo,
          memberName: m.memberName,
          status: m.status,
          monthlyPaid: memberColl,
          f5wPaid: memberF5W,
          totalPaid
        };
      })
      .filter(row => {
        // Apply search filter (name or member number)
        const matchesSearch =
          row.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.memberNo.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Hide inactive members only if they have zero payments in both
        const isParticipant = row.monthlyPaid > 0 || row.f5wPaid > 0 || row.status === 'Active';
        
        return matchesSearch && isParticipant;
      })
      // Sort by member number numerically
      .sort((a, b) => {
        const numA = parseInt(a.memberNo, 10);
        const numB = parseInt(b.memberNo, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.memberNo.localeCompare(b.memberNo, undefined, { numeric: true });
      });
  }, [members, collections, f5wData, selectedYear, searchTerm]);

  // Aggregate totals of filtered rows for bottom table footer
  const filteredTableTotals = useMemo(() => {
    let monthlySum = 0;
    let f5wSum = 0;
    let combinedSum = 0;

    memberAuditRows.forEach(row => {
      monthlySum += row.monthlyPaid;
      f5wSum += row.f5wPaid;
      combinedSum += row.totalPaid;
    });

    return {
      monthlySum,
      f5wSum,
      combinedSum
    };
  }, [memberAuditRows]);

  // Excel Export
  const handleExportExcel = () => {
    const exportData = memberAuditRows.map(r => ({
      'Member Number': r.memberNo,
      'Member Name': r.memberName,
      'Status': r.status,
      'Monthly Collection Paid (INR)': r.monthlyPaid,
      'F5W Paid (INR)': r.f5wPaid,
      'Combined Total Paid (INR)': r.totalPaid
    }));

    // Add aggregate footer
    exportData.push({
      'Member Number': 'TOTAL',
      'Member Name': `Filtered (${memberAuditRows.length} Members)`,
      'Status': '',
      'Monthly Collection Paid (INR)': filteredTableTotals.monthlySum,
      'F5W Paid (INR)': filteredTableTotals.f5wSum,
      'Combined Total Paid (INR)': filteredTableTotals.combinedSum
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grand Total Ledger');
    XLSX.writeFile(workbook, `USBA_Grand_Total_Ledger_${selectedYear}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Percentages for contribution display
  const monthlyPct = useMemo(() => {
    const total = consolidatedMetrics.grandTotal;
    if (total === 0) return 50;
    return Math.round((consolidatedMetrics.monthlyTotal / total) * 100);
  }, [consolidatedMetrics]);

  const f5wPct = 100 - monthlyPct;

  return (
    <div className="space-y-6">
      {/* Printable Header - hidden on screen, visible on print */}
      <div className="hidden print:block text-center space-y-2 border-b border-zinc-200 pb-6 mb-6">
        <h1 className="text-3xl font-black tracking-wide text-emerald-800">USBA MARRIAGE FUND</h1>
        <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">Official Grand Total Ledger Report</p>
        <p className="text-xs font-mono text-zinc-400">
          Financial Year: {selectedYear === 'All' ? 'All Cumulative' : selectedYear} | Compiled on {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <Calculator className="w-5 h-5" />
            </span>
            Grand Total Ledger
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Consolidated statement of monthly subscriptions combined with F5W special weekly collections.
          </p>
        </div>

        {/* Excel & Print Buttons */}
        <div className="flex gap-2.5 shrink-0">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
            id="grand-total-export-excel-btn"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Export Excel
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            id="grand-total-print-btn"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* KPI Cards section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Grand Total */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-6 rounded-3xl shadow-md border border-emerald-500/10 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Grand Total Fund</span>
            <Calculator className="w-5 h-5 text-emerald-200" />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black font-mono">
              ₹{consolidatedMetrics.grandTotal.toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-emerald-200 mt-1 font-medium">
              Unified cumulative revenue pool ({selectedYear === 'All' ? 'All Years' : selectedYear})
            </p>
          </div>
        </div>

        {/* Card 2: Monthly Collections */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Monthly Collections</span>
            <CheckSquare className="w-5 h-5 text-blue-500" />
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-zinc-800 dark:text-zinc-100 font-mono">
              ₹{consolidatedMetrics.monthlyTotal.toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 font-medium">
              Share of subscription payments ({monthlyPct}%)
            </p>
          </div>
        </div>

        {/* Card 3: F5W Contributions */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">F5W Contributions</span>
            <Coins className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-zinc-800 dark:text-zinc-100 font-mono">
              ₹{consolidatedMetrics.f5wTotal.toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 font-medium">
              Share of 5-week ledger matrix ({f5wPct}%)
            </p>
          </div>
        </div>
      </div>

      {/* Distribution visual progress bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-5 rounded-3xl shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
          <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Monthly Collections: {monthlyPct}%
          </span>
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            F5W Collections: {f5wPct}%
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </span>
        </div>
        <div className="w-full h-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
          <div 
            style={{ width: `${monthlyPct}%` }} 
            className="h-full bg-blue-500 transition-all duration-500" 
            title={`Monthly Collections: ₹${consolidatedMetrics.monthlyTotal}`}
          />
          <div 
            style={{ width: `${f5wPct}%` }} 
            className="h-full bg-amber-500 transition-all duration-500" 
            title={`F5W Collections: ₹${consolidatedMetrics.f5wTotal}`}
          />
        </div>
      </div>

      {/* Selectors and search filter bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4 rounded-3xl shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between print:hidden">
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Financial Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold"
              id="grand-total-year-selector"
            >
              <option value="All">All Years (Cumulative)</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Search */}
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search member name or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400"
            id="grand-total-search-input"
          />
        </div>
      </div>

      {/* Audit table card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Consolidated Member Audit Book</h3>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Showing individual receipts for {memberAuditRows.length} contributing members</p>
          </div>
          <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
            Year: {selectedYear === 'All' ? 'All' : selectedYear}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-500 font-bold border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-3 w-20">No</th>
                <th className="px-6 py-3">Member Name</th>
                <th className="px-6 py-3 text-right">Monthly Collection</th>
                <th className="px-6 py-3 text-right">F5W Collections</th>
                <th className="px-6 py-3 text-right font-extrabold text-emerald-800 dark:text-emerald-400">Combined Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {memberAuditRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 dark:text-zinc-500 font-semibold">
                    No matching member receipts found.
                  </td>
                </tr>
              ) : (
                memberAuditRows.map((row) => (
                  <tr key={row.memberNo} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-3 font-bold font-mono text-zinc-500">{row.memberNo}</td>
                    <td className="px-6 py-3">
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">{row.memberName}</div>
                      <div className="text-[9px] text-zinc-400 font-medium">
                        {row.status === 'Active' ? (
                          <span className="text-emerald-500 font-semibold">● Active Member</span>
                        ) : (
                          <span className="text-zinc-400 font-semibold">○ Inactive (Settled)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-semibold text-zinc-600 dark:text-zinc-300">
                      ₹{row.monthlyPaid.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-semibold text-zinc-600 dark:text-zinc-300">
                      ₹{row.f5wPaid.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">
                      ₹{row.totalPaid.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Table Footer with Filtered Row Aggregations */}
            {memberAuditRows.length > 0 && (
              <tfoot>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 font-extrabold text-zinc-700 dark:text-zinc-200">
                  <td className="px-6 py-4" colSpan={2}>
                    Filtered Total ({memberAuditRows.length} Members)
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-zinc-900 dark:text-zinc-100">
                    ₹{filteredTableTotals.monthlySum.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-zinc-900 dark:text-zinc-100">
                    ₹{filteredTableTotals.f5wSum.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-emerald-800 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 text-sm font-black">
                    ₹{filteredTableTotals.combinedSum.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Professional disclaimer / notes footer */}
      <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800 p-4 rounded-2xl flex items-start gap-3 text-[11px] text-zinc-500 leading-relaxed">
        <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-zinc-700 dark:text-zinc-300">Consolidated Accounting Rules:</p>
          <p>
            This ledger aggregates subscription values marked as **Paid** inside the Monthly Collection module along with any individual member week-by-week values stored within the F5W matrix. Standard pending collections or draft entries are excluded from this statement to maintain absolute audit integrity.
          </p>
        </div>
      </div>
    </div>
  );
}
