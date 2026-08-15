import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  FileSpreadsheet,
  Calendar,
  Layers,
  Users,
  Coins,
  ArrowUpDown,
  DollarSign,
  TrendingUp,
  Bookmark,
  TrendingDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Member, MonthlyCollection, Loan, LoanRepayment, Income, Expense, Drawing, F5WCollection } from '../types';

interface ReportsProps {
  members: Member[];
  collections: MonthlyCollection[];
  loans: Loan[];
  repayments: LoanRepayment[];
  income: Income[];
  expense: Expense[];
  drawings?: Drawing[];
  f5wData?: F5WCollection[];
}

type ReportType =
  | 'monthly'
  | 'yearly'
  | 'member'
  | 'loan'
  | 'income'
  | 'expense'
  | 'balance';

export default function Reports({
  members,
  collections,
  loans,
  repayments,
  income,
  expense,
  drawings = [],
  f5wData = []
}: ReportsProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>('balance');

  const YEARS = ['2025-2026', '2026-2027', '2027-2028', '2028-2029'];
  const MONTHS = [
    'May', 'June', 'July', 'August', 'September', 'October',
    'November', 'December', 'January', 'February', 'March', 'April'
  ];

  const getCurrentMonthName = (): string => {
    const date = new Date();
    const monthName = date.toLocaleString('en-US', { month: 'long' });
    return MONTHS.includes(monthName) ? monthName : 'August';
  };

  const getCurrentFinancialYear = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth(); // 0 = Jan, 4 = May
    const finYear = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    return YEARS.includes(finYear) ? finYear : '2026-2027';
  };

  // Filters for monthly/yearly reports
  const [filterYear, setFilterYear] = useState<string>(() => getCurrentFinancialYear());
  const [filterMonth, setFilterMonth] = useState<string>(() => getCurrentMonthName());

  // ---------------- DATASHEET COMPILING & AGGREGATIONS ----------------

  // 1. Balance Report data
  const balanceSheetData = useMemo(() => {
    // F5W Collection paid total
    const f5wPaidTotal = f5wData.reduce((sum, f) => {
      return sum + (f.col1 || 0) + (f.col2 || 0) + (f.col3 || 0) + (f.col4 || 0) + (f.col5 || 0);
    }, 0);

    // F5W Collection paid via Google Pay (defaults to GPay if colMode is not 'Cash')
    const f5wGPayTotal = f5wData.reduce((sum, f) => {
      const v1 = (f.col1Mode === 'Cash') ? 0 : (f.col1 || 0);
      const v2 = (f.col2Mode === 'Cash') ? 0 : (f.col2 || 0);
      const v3 = (f.col3Mode === 'Cash') ? 0 : (f.col3 || 0);
      const v4 = (f.col4Mode === 'Cash') ? 0 : (f.col4 || 0);
      const v5 = (f.col5Mode === 'Cash') ? 0 : (f.col5 || 0);
      return sum + v1 + v2 + v3 + v4 + v5;
    }, 0);

    // F5W Collection paid via Cash
    const f5wCashTotal = f5wData.reduce((sum, f) => {
      const v1 = (f.col1Mode === 'Cash') ? (f.col1 || 0) : 0;
      const v2 = (f.col2Mode === 'Cash') ? (f.col2 || 0) : 0;
      const v3 = (f.col3Mode === 'Cash') ? (f.col3 || 0) : 0;
      const v4 = (f.col4Mode === 'Cash') ? (f.col4 || 0) : 0;
      const v5 = (f.col5Mode === 'Cash') ? (f.col5 || 0) : 0;
      return sum + v1 + v2 + v3 + v4 + v5;
    }, 0);

    // Process loans with original amounts for accurate cash flow calculations
    const processedLoans = loans.map(l => {
      const repaymentsForLoan = repayments.filter(r => r.loanId === l.id);
      const totalRepaidForLoan = repaymentsForLoan.reduce((sum, r) => sum + r.amount, 0);
      return {
        ...l,
        amount: l.amount + totalRepaidForLoan
      };
    });

    const totalColl = collections.filter(c => c.status === 'Paid').reduce((sum, c) => sum + c.amount, 0) + f5wPaidTotal;
    const totalInc = income.reduce((sum, i) => sum + i.amount, 0);
    const totalRep = repayments.reduce((sum, r) => sum + r.amount, 0);
    const totalGiv = processedLoans.reduce((sum, l) => sum + l.amount, 0);
    const totalExp = expense.reduce((sum, e) => sum + e.amount, 0);
    const netBal = (totalColl + totalInc + totalRep) - (totalGiv + totalExp);

    // Cash vs GPay
    const collCash = collections.filter(c => c.status === 'Paid' && (c.paymentMode === 'Cash' || !c.paymentMode)).reduce((sum, c) => sum + c.amount, 0) + f5wCashTotal;
    const incCash = income.filter(i => i.paymentMode === 'Cash' || !i.paymentMode).reduce((sum, i) => sum + i.amount, 0);
    const repCash = repayments.filter(r => r.paymentMode === 'Cash' || !r.paymentMode).reduce((sum, r) => sum + r.amount, 0);
    const givCash = processedLoans.filter(l => l.paymentMode === 'Cash' || !l.paymentMode).reduce((sum, l) => sum + l.amount, 0);
    const expCash = expense.filter(e => e.paymentMode === 'Cash' || !e.paymentMode).reduce((sum, e) => sum + e.amount, 0);
    
    const totalWithdrawn = drawings.reduce((sum, d) => sum + d.amount, 0);
    const cashInHand = (collCash + incCash + repCash + totalWithdrawn) - (givCash + expCash);

    const collGPay = collections.filter(c => c.status === 'Paid' && c.paymentMode === 'Google Pay').reduce((sum, c) => sum + c.amount, 0) + f5wGPayTotal;
    const incGPay = income.filter(i => i.paymentMode === 'Google Pay').reduce((sum, i) => sum + i.amount, 0);
    const repGPay = repayments.filter(r => r.paymentMode === 'Google Pay').reduce((sum, r) => sum + r.amount, 0);
    const givGPay = processedLoans.filter(l => l.paymentMode === 'Google Pay').reduce((sum, l) => sum + l.amount, 0);
    const expGPay = expense.filter(e => e.paymentMode === 'Google Pay').reduce((sum, e) => sum + e.amount, 0);
    const gpayBalance = (collGPay + incGPay + repGPay) - (givGPay + expGPay + totalWithdrawn);

    return {
      totalColl,
      totalInc,
      totalRep,
      totalGiv,
      totalExp,
      netBal,
      cashInHand,
      gpayBalance
    };
  }, [collections, income, repayments, loans, expense, drawings, f5wData]);

  // 2. Monthly Report data
  const monthlyReportData = useMemo(() => {
    const periodColl = collections.filter(c => c.year === filterYear && c.month === filterMonth && c.status === 'Paid');
    const periodCollSum = periodColl.reduce((sum, c) => sum + c.amount, 0);

    const periodInc = income.filter(i => i.date.includes(`${filterYear.split('-')[0]}`) || i.date.includes(`${filterYear.split('-')[1]}`)); // approximate or date match
    const periodGiv = loans.filter(l => l.date.includes(`${filterYear.split('-')[0]}`));
    const periodExp = expense.filter(e => e.date.includes(`${filterYear.split('-')[0]}`));

    return {
      periodColl,
      periodCollSum,
      periodInc,
      periodGiv,
      periodExp
    };
  }, [collections, income, loans, expense, filterYear, filterMonth]);

  // 3. Yearly Report data
  const yearlyReportData = useMemo(() => {
    const yrColl = collections.filter(c => c.year === filterYear && c.status === 'Paid').reduce((sum, c) => sum + c.amount, 0);
    const yrGiv = loans.reduce((sum, l) => sum + l.amount, 0); // approx
    const yrRep = repayments.reduce((sum, r) => sum + r.amount, 0);
    const yrExp = expense.reduce((sum, e) => sum + e.amount, 0);

    return {
      yrColl,
      yrGiv,
      yrRep,
      yrExp
    };
  }, [collections, loans, repayments, expense, filterYear]);

  // ---------------- EXPORT MECHANISMS ----------------

  // Export spreadsheet via SheetJS
  const handleExportExcel = () => {
    let sheetData: any[] = [];
    let fileName = `USBA_Report_${selectedReport}`;

    if (selectedReport === 'balance') {
      sheetData = [
        { 'Account Ledger': 'Total Members Collections Paid', 'Amount (INR)': balanceSheetData.totalColl },
        { 'Account Ledger': 'Total Miscellaneous Income', 'Amount (INR)': balanceSheetData.totalInc },
        { 'Account Ledger': 'Total Loan Repayments Received', 'Amount (INR)': balanceSheetData.totalRep },
        { 'Account Ledger': 'Total Loans Given (Disbursed)', 'Amount (INR)': balanceSheetData.totalGiv },
        { 'Account Ledger': 'Total Expenses Incurred', 'Amount (INR)': balanceSheetData.totalExp },
        { 'Account Ledger': '------------------', 'Amount (INR)': '--------' },
        { 'Account Ledger': 'Net Fund Balance', 'Amount (INR)': balanceSheetData.netBal },
        { 'Account Ledger': 'Physical Cash in Hand', 'Amount (INR)': balanceSheetData.cashInHand },
        { 'Account Ledger': 'Google Pay Bank Balance', 'Amount (INR)': balanceSheetData.gpayBalance }
      ];
    } else if (selectedReport === 'member') {
      sheetData = members.map(m => {
        const mPaid = collections.filter(c => c.memberNo === m.memberNo && c.status === 'Paid').reduce((sum, c) => sum + c.amount, 0);
        const mLoans = loans.filter(l => l.memberNo === m.memberNo).reduce((sum, l) => sum + l.amount, 0);
        const mRepaid = repayments.filter(r => r.memberNo === m.memberNo).reduce((sum, r) => sum + r.amount, 0);
        return {
          'Member Number': m.memberNo,
          'Member Name': m.memberName,
          'Phone': m.phone,
          'Status': m.status,
          'Total Paid Collection (INR)': mPaid,
          'Total Loans Taken (INR)': mLoans,
          'Active Loan Balance (INR)': mLoans - mRepaid
        };
      });
    } else if (selectedReport === 'loan') {
      const loanList = loans.filter(l => l.type === 'loan' || !l.type);
      const givenList = loans.filter(l => l.type === 'given');

      sheetData = [
        ...loanList.map(l => {
          const reps = repayments.filter(r => r.memberNo === l.memberNo).reduce((sum, r) => sum + r.amount, 0);
          return {
            'Type': 'Loan (Repayable)',
            'Disbursement Date': l.date,
            'Member No': l.memberNo,
            'Member Name': l.memberName,
            'Principal Amount': l.amount,
            'Total Repaid to Date': reps,
            'Remaining Balance': l.amount - reps,
            'Payment Mode': l.paymentMode
          };
        }),
        ...givenList.map(l => ({
          'Type': 'Given Amount (Non-Repayable)',
          'Disbursement Date': l.date,
          'Member No': l.memberNo,
          'Member Name': l.memberName,
          'Principal Amount': l.amount,
          'Total Repaid to Date': 0,
          'Remaining Balance': 0,
          'Payment Mode': l.paymentMode
        }))
      ];
    } else if (selectedReport === 'income') {
      sheetData = income.map(i => ({
        'Date': i.date,
        'Category': i.category,
        'Amount': i.amount,
        'Payment Mode': i.paymentMode,
        'Description': i.description
      }));
    } else if (selectedReport === 'expense') {
      sheetData = expense.map(e => ({
        'Date': e.date,
        'Category': e.category,
        'Amount': e.amount,
        'Payment Mode': e.paymentMode,
        'Description': e.description
      }));
    } else if (selectedReport === 'monthly') {
      sheetData = monthlyReportData.periodColl.map(c => ({
        'Member Number': c.memberNo,
        'Member Name': c.memberName,
        'Paid Period': `${c.month} ${c.year}`,
        'Amount Received': c.amount,
        'Payment Mode': c.paymentMode,
        'Remarks': c.remarks
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger Sheet');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  // Printable Report Layout trigger
  const handlePrint = () => {
    window.print();
  };

  const reportOptions = [
    { type: 'balance' as const, label: 'Balance Sheet', icon: FileText },
    { type: 'monthly' as const, label: 'Monthly Statement', icon: Calendar },
    { type: 'yearly' as const, label: 'Yearly Summary', icon: Layers },
    { type: 'member' as const, label: 'Members Audit', icon: Users },
    { type: 'loan' as const, label: 'Loans Outstanding', icon: DollarSign },
    { type: 'income' as const, label: 'Other Receipts', icon: TrendingUp },
    { type: 'expense' as const, label: 'Expense Ledgers', icon: TrendingDown }
  ];

  return (
    <div className="space-y-6">
      {/* Printable Header - hidden on screen, visible on print */}
      <div className="hidden print:block text-center space-y-2 border-b border-zinc-200 pb-6 mb-6">
        <h1 className="text-3xl font-black tracking-wide text-emerald-800">USBA MARRIAGE FUND</h1>
        <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">Official Financial Audit Report</p>
        <p className="text-xs font-mono text-zinc-400">Compiled on {new Date().toLocaleDateString()}</p>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </span>
            Financial Audits & Reports
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Generate printable spreadsheets, balance sheets, member books, and yearly statements.
          </p>
        </div>

        {/* Print / Excel Action Buttons */}
        <div className="flex gap-2.5 shrink-0">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
            id="reports-export-excel-btn"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Export Excel
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            id="reports-print-btn"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Sidebar selection & view panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Report Picker Menu */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4 rounded-3xl shadow-sm space-y-2 print:hidden">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-2 mb-3">
            Choose Ledger
          </h3>
          {reportOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.type}
                onClick={() => setSelectedReport(opt.type)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all text-left cursor-pointer ${
                  selectedReport === opt.type
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shadow-xs border border-emerald-100/50 dark:border-emerald-900/30'
                    : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
                id={`report-select-btn-${opt.type}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Report Content Panel */}
        <div className="lg:col-span-9 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm min-h-[500px]">
          
          {/* Filters Bar for specific reports */}
          {(selectedReport === 'monthly' || selectedReport === 'yearly') && (
            <div className="flex flex-wrap items-center gap-4 bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 mb-6 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-400 uppercase">Year:</span>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-lg text-xs font-bold"
                  id="report-filter-year"
                >
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {selectedReport === 'monthly' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase">Month:</span>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-lg text-xs font-bold"
                    id="report-filter-month"
                  >
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ---------------- RENDER REPORTS ---------------- */}

          {/* 1. BALANCE SHEET REPORT */}
          {selectedReport === 'balance' && (
            <div className="space-y-6">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">General Balance Sheet</h2>
                <p className="text-xs text-zinc-400 mt-1">Summary audit of all physical and digital fund ledgers</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ledger Assets table */}
                <div className="space-y-2 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800 text-xs font-bold uppercase text-zinc-400 tracking-wider">
                    Receipts & Inflow
                  </div>
                  <div className="p-4 space-y-3.5 text-sm font-medium">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Members Collections Paid</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        ₹{balanceSheetData.totalColl.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Sadaqah & Donations</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        ₹{balanceSheetData.totalInc.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Loan Repayments Received</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        ₹{balanceSheetData.totalRep.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ledger Debits table */}
                <div className="space-y-2 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800 text-xs font-bold uppercase text-zinc-400 tracking-wider">
                    Debits & Outflow
                  </div>
                  <div className="p-4 space-y-3.5 text-sm font-medium">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Marriage Aid (Disbursed Loans)</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        -₹{balanceSheetData.totalGiv.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Administrative / Stationery Costs</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        -₹{balanceSheetData.totalExp.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Balance Sheet */}
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center text-emerald-800 dark:text-emerald-300">
                  <span className="font-bold">Total Net Balance</span>
                  <span className="text-2xl font-black font-mono">
                    ₹{balanceSheetData.netBal.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="border-t border-emerald-200/50 dark:border-emerald-900/40 pt-4 grid grid-cols-2 gap-4 text-xs font-bold text-zinc-500">
                  <div>
                    <span className="block text-[10px] uppercase text-zinc-400">Cash In Hand</span>
                    <span className="text-sm text-zinc-800 dark:text-zinc-200 font-bold font-mono">
                      ₹{balanceSheetData.cashInHand.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-zinc-400">Google Pay</span>
                    <span className="text-sm text-zinc-800 dark:text-zinc-200 font-bold font-mono">
                      ₹{balanceSheetData.gpayBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. MONTHLY REPORT */}
          {selectedReport === 'monthly' && (
            <div className="space-y-6">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Monthly Statement ({filterMonth} {filterYear})
                </h2>
                <p className="text-xs text-zinc-400 mt-1">Audit log of all transactions registered in this month</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <span className="text-sm font-bold text-zinc-500">Period Collection Amount</span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  ₹{monthlyReportData.periodCollSum.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Collections table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Collections Received</h3>
                <div className="overflow-x-auto border border-zinc-100 dark:border-zinc-800 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 font-bold border-b border-zinc-100 dark:border-zinc-800">
                        <th className="px-4 py-2.5">Member No</th>
                        <th className="px-4 py-2.5">Member Name</th>
                        <th className="px-4 py-2.5">Amount</th>
                        <th className="px-4 py-2.5">Mode</th>
                        <th className="px-4 py-2.5">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {monthlyReportData.periodColl.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-zinc-400 font-medium">
                            No collection entries logged for this month.
                          </td>
                        </tr>
                      ) : (
                        monthlyReportData.periodColl.map((col, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/50">
                            <td className="px-4 py-2.5 font-bold">{col.memberNo}</td>
                            <td className="px-4 py-2.5 font-bold">{col.memberName}</td>
                            <td className="px-4 py-2.5 font-bold font-mono">₹{col.amount}</td>
                            <td className="px-4 py-2.5">{col.paymentMode || 'Cash'}</td>
                            <td className="px-4 py-2.5 italic text-zinc-400">{col.remarks || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. YEARLY REPORT */}
          {selectedReport === 'yearly' && (
            <div className="space-y-6">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Yearly Summary ({filterYear})
                </h2>
                <p className="text-xs text-zinc-400 mt-1">Aggregated books summary for the chosen financial year</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-sm font-semibold text-zinc-500">Aggregate Yearly Collection</span>
                  <span className="text-base font-black text-emerald-700 dark:text-emerald-400 font-mono">
                    ₹{yearlyReportData.yrColl.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-sm font-semibold text-zinc-500">Total Loans Granted</span>
                  <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                    -₹{yearlyReportData.yrGiv.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-sm font-semibold text-zinc-500">Total Loan Repayments Received</span>
                  <span className="text-base font-black text-emerald-700 dark:text-emerald-400 font-mono">
                    ₹{yearlyReportData.yrRep.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3">
                  <span className="text-sm font-semibold text-zinc-500">Operational Debits/Expenses</span>
                  <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                    -₹{yearlyReportData.yrExp.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. MEMBER AUDIT REPORT */}
          {selectedReport === 'member' && (
            <div className="space-y-6">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Members Financial Audit</h2>
                <p className="text-xs text-zinc-400 mt-1">Review active member collection statistics, loan holdings, and outstanding dues</p>
              </div>

              <div className="overflow-x-auto border border-zinc-100 dark:border-zinc-800 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 font-bold">
                      <th className="px-4 py-3">No</th>
                      <th className="px-4 py-3">Member Name</th>
                      <th className="px-4 py-3">Total Paid</th>
                      <th className="px-4 py-3">Loans Taken</th>
                      <th className="px-4 py-3">Loan Balance</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {members.map((m) => {
                      const mPaid = collections.filter(c => c.memberNo === m.memberNo && c.status === 'Paid').reduce((sum, c) => sum + c.amount, 0);
                      const mLoans = loans.filter(l => l.memberNo === m.memberNo).reduce((sum, l) => sum + l.amount, 0);
                      const mRepaid = repayments.filter(r => r.memberNo === m.memberNo).reduce((sum, r) => sum + r.amount, 0);
                      const mBal = mLoans - mRepaid;

                      return (
                        <tr key={m.memberNo} className="hover:bg-zinc-50/50">
                          <td className="px-4 py-2.5 font-bold font-mono">{m.memberNo}</td>
                          <td className="px-4 py-2.5 font-bold text-zinc-800 dark:text-zinc-200">{m.memberName}</td>
                          <td className="px-4 py-2.5 font-bold font-mono">₹{mPaid.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2.5 font-bold font-mono">₹{mLoans.toLocaleString('en-IN')}</td>
                          <td className={`px-4 py-2.5 font-bold font-mono ${mBal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-500'}`}>
                            ₹{mBal.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-zinc-500">{m.status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. LOANS REPORT */}
          {selectedReport === 'loan' && (
            <div className="space-y-8">
              {/* Table 1: Loans */}
              <div className="space-y-4">
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Approved Loans & Balances</h2>
                  <p className="text-xs text-zinc-400 mt-1">Complete statement of outstanding principal balances</p>
                </div>

                <div className="overflow-x-auto border border-zinc-100 dark:border-zinc-800 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 font-bold">
                        <th className="px-4 py-3">Member Name</th>
                        <th className="px-4 py-3">Disbursement</th>
                        <th className="px-4 py-3">Total Repaid</th>
                        <th className="px-4 py-3">Loan Balance</th>
                        <th className="px-4 py-3">Payment Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {loans.filter((l) => l.type === 'loan' || !l.type).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-6 text-zinc-400 font-medium">No active loans logged.</td>
                        </tr>
                      ) : (
                        loans.filter((l) => l.type === 'loan' || !l.type).map((l) => {
                          const reps = repayments.filter(r => r.memberNo === l.memberNo).reduce((sum, r) => sum + r.amount, 0);
                          const mBal = l.amount - reps;
                          return (
                            <tr key={l.id} className="hover:bg-zinc-50/50">
                              <td className="px-4 py-2.5 font-bold">{l.memberName}</td>
                              <td className="px-4 py-2.5 font-bold font-mono">₹{l.amount.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-2.5 font-bold font-mono text-emerald-600">₹{reps.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-2.5 font-bold font-mono text-rose-600">₹{mBal.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-2.5 text-zinc-500">{l.paymentMode || 'Cash'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table 2: Given Amounts */}
              <div className="space-y-4">
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Given Amounts (Grants)</h2>
                  <p className="text-xs text-zinc-400 mt-1">Audit log of all non-repayable aid given to members</p>
                </div>

                <div className="overflow-x-auto border border-zinc-100 dark:border-zinc-800 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 font-bold">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Member Name</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Payment Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {loans.filter((l) => l.type === 'given').length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-6 text-zinc-400 font-medium">No given amounts logged.</td>
                        </tr>
                      ) : (
                        loans.filter((l) => l.type === 'given').map((l) => (
                          <tr key={l.id} className="hover:bg-zinc-50/50">
                            <td className="px-4 py-2.5 font-mono">{l.date}</td>
                            <td className="px-4 py-2.5 font-bold">{l.memberName}</td>
                            <td className="px-4 py-2.5 font-bold font-mono text-amber-600">₹{l.amount.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2.5 text-zinc-500">{l.paymentMode || 'Cash'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. INCOME REPORT */}
          {selectedReport === 'income' && (
            <div className="space-y-6">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Miscellaneous Receipts Log</h2>
                <p className="text-xs text-zinc-400 mt-1">Audit trail of non-subscription assets and donations</p>
              </div>

              <div className="overflow-x-auto border border-zinc-100 dark:border-zinc-800 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 font-bold">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Payment Mode</th>
                      <th className="px-4 py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {income.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-zinc-400 font-medium">No income receipts found.</td>
                      </tr>
                    ) : (
                      income.map((inc) => (
                        <tr key={inc.id} className="hover:bg-zinc-50/50">
                          <td className="px-4 py-2.5 font-mono">{inc.date}</td>
                          <td className="px-4 py-2.5 font-bold">{inc.category}</td>
                          <td className="px-4 py-2.5 font-bold text-emerald-600 font-mono">₹{inc.amount.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2.5">{inc.paymentMode || 'Cash'}</td>
                          <td className="px-4 py-2.5 text-zinc-500">{inc.description}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. EXPENSE REPORT */}
          {selectedReport === 'expense' && (
            <div className="space-y-6">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Operational Expense Ledger</h2>
                <p className="text-xs text-zinc-400 mt-1">Detailed breakdown of organizational operational costs</p>
              </div>

              <div className="overflow-x-auto border border-zinc-100 dark:border-zinc-800 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 font-bold">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Payment Mode</th>
                      <th className="px-4 py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {expense.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-zinc-400 font-medium">No operational expenses logged.</td>
                      </tr>
                    ) : (
                      expense.map((exp) => (
                        <tr key={exp.id} className="hover:bg-zinc-50/50">
                          <td className="px-4 py-2.5 font-mono">{exp.date}</td>
                          <td className="px-4 py-2.5 font-bold">{exp.category}</td>
                          <td className="px-4 py-2.5 font-bold text-rose-600 font-mono">₹{exp.amount.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2.5">{exp.paymentMode || 'Cash'}</td>
                          <td className="px-4 py-2.5 text-zinc-500">{exp.description}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
