import React, { useMemo } from 'react';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Coins,
  DollarSign,
  TrendingUp,
  FileText,
  Calendar,
  CreditCard,
  Clock,
  History,
  Info
} from 'lucide-react';
import { Member, MonthlyCollection, Loan, LoanRepayment } from '../types';

interface MemberProfileProps {
  memberNo: string;
  members: Member[];
  collections: MonthlyCollection[];
  loans: Loan[];
  repayments: LoanRepayment[];
  onBack: () => void;
}

export default function MemberProfile({
  memberNo,
  members,
  collections,
  loans,
  repayments,
  onBack
}: MemberProfileProps) {
  // Find member
  const member = useMemo(() => {
    return members.find(m => m.memberNo === memberNo);
  }, [members, memberNo]);

  // Find collections for this member
  const memberCollections = useMemo(() => {
    return collections
      .filter(c => c.memberNo === memberNo)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [collections, memberNo]);

  // Find loans for this member
  const memberLoans = useMemo(() => {
    return loans
      .filter(l => l.memberNo === memberNo)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [loans, memberNo]);

  // Find repayments for this member
  const memberRepayments = useMemo(() => {
    return repayments
      .filter(r => r.memberNo === memberNo)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [repayments, memberNo]);

  // Calculations
  const totalPaidCollection = useMemo(() => {
    return memberCollections
      .filter(c => c.status === 'Paid')
      .reduce((sum, c) => sum + c.amount, 0);
  }, [memberCollections]);

  const totalLoansReturned = useMemo(() => {
    return memberRepayments.reduce((sum, r) => sum + r.amount, 0);
  }, [memberRepayments]);

  const remainingLoanBalance = useMemo(() => {
    return memberLoans.reduce((sum, l) => sum + l.amount, 0);
  }, [memberLoans]);

  const totalLoansTaken = remainingLoanBalance + totalLoansReturned;

  // Expected financial year list for pending months calculation
  const years = ['2025-2026', '2026-2027', '2027-2028', '2028-2029'];
  const months = [
    'May', 'June', 'July', 'August', 'September', 'October',
    'November', 'December', 'January', 'February', 'March', 'April'
  ];

  // Pending months calculation
  // A month is pending if there is either an explicit record with status "Pending", OR there is NO record in the current financial year "2026-2027" (or whichever years they have any payment history in).
  // Let's check for the current year "2026-2027" which matches our system time (July 2026).
  const pendingMonthsList = useMemo(() => {
    const list: { year: string; month: string }[] = [];
    const activeYear = '2026-2027'; // Current default year

    // Check months of the active year first
    months.forEach(month => {
      const record = memberCollections.find(c => c.year === activeYear && c.month === month);
      if (!record || record.status === 'Pending') {
        list.push({ year: activeYear, month });
      }
    });

    return list;
  }, [memberCollections]);

  if (!member) {
    return (
      <div className="space-y-4 p-8 text-center bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl">
        <p className="text-zinc-500">Member profile not found or deleted.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button & Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl transition-all border border-zinc-200 dark:border-zinc-700 cursor-pointer shrink-0"
          id="profile-back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Member Profile</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Comprehensive member ledger, subscription balances, and transaction ledger.
          </p>
        </div>
      </div>

      {/* Main Grid: Info Sidebar & Details Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Info Sidebar (Profile Details Card) */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-2 bg-emerald-700"></div>

          {/* Avatar Icon */}
          <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-100 dark:border-emerald-900 rounded-full flex items-center justify-center text-emerald-700 dark:text-emerald-400 mt-4 mb-4 shadow-inner">
            <User className="w-12 h-12" />
          </div>

          <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
            {member.memberName}
          </h2>
          <p className="font-mono text-xs text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full mt-1.5">
            MEMBER NO. {member.memberNo}
          </p>

          {/* Badges/Details */}
          <div className="w-full mt-6 space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-6 text-left">
            {/* Phone */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-400 rounded-xl">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-semibold">Phone Number</p>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                  {member.phone || 'N/A'}
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-400 rounded-xl">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-semibold">Address</p>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 leading-snug">
                  {member.address || 'N/A'}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-400 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-semibold">Membership Status</p>
                {member.status === 'Active' ? (
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/30 inline-block mt-0.5">
                    Active
                  </span>
                ) : (
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-md border border-rose-100 dark:border-rose-900/30 inline-block mt-0.5">
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Details Content */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Summary Mini Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Paid Collections */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Total Paid</p>
                <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">
                  ₹{totalPaidCollection.toLocaleString('en-IN')}
                </h3>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-xl shrink-0">
                <Coins className="w-5 h-5" />
              </div>
            </div>

            {/* Loans Taken */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Loans Taken</p>
                <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">
                  ₹{totalLoansTaken.toLocaleString('en-IN')}
                </h3>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* Loan Balance */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Loan Balance</p>
                <h3 className={`text-xl font-extrabold ${remainingLoanBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-50'}`}>
                  ₹{remainingLoanBalance.toLocaleString('en-IN')}
                </h3>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Pending Months Alert */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Pending Months (2026-2027)
            </h3>

            {pendingMonthsList.length === 0 ? (
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl text-sm text-emerald-800 dark:text-emerald-300 font-medium">
                Alhamdulillah! This member has no pending months in the current financial cycle.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {pendingMonthsList.map((p, idx) => (
                  <span
                    key={idx}
                    className="px-3.5 py-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold font-mono"
                  >
                    {p.month} ({p.year})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Payment History Log */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              Payment History
            </h3>

            {memberCollections.length === 0 ? (
              <p className="text-sm text-zinc-400 py-6 text-center">
                No payment collection history registered.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3">Year / Month</th>
                      <th className="py-3">Amount</th>
                      <th className="py-3">Payment Mode</th>
                      <th className="py-3">Status</th>
                      <th className="py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {memberCollections.map((col, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-800/10 transition-colors">
                        <td className="py-3.5 font-semibold text-zinc-800 dark:text-zinc-200">
                          {col.month} {col.year}
                        </td>
                        <td className="py-3.5 font-bold font-mono text-zinc-900 dark:text-zinc-100">
                          ₹{col.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {col.paymentMode || 'Cash'}
                        </td>
                        <td className="py-3.5">
                          {col.status === 'Paid' ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-100 dark:border-emerald-900/30">
                              Paid
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[11px] font-bold border border-zinc-200">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 text-zinc-500 dark:text-zinc-400 italic max-w-xs truncate text-xs">
                          {col.remarks || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Loans History Log */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Loan & Repayment Ledger
            </h3>

            {memberLoans.length === 0 && memberRepayments.length === 0 ? (
              <p className="text-sm text-zinc-400 py-6 text-center">
                No loan files or repayments found for this member.
              </p>
            ) : (
              <div className="space-y-6">
                {/* Loans Taken Table */}
                {memberLoans.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      Loans Disbursed
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
                            <th className="py-2">Date</th>
                            <th className="py-2">Amount</th>
                            <th className="py-2">Payment Mode</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {memberLoans.map((loan, idx) => (
                            <tr key={idx} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-800/10 transition-colors">
                              <td className="py-2.5 font-mono text-zinc-600 dark:text-zinc-400">
                                {loan.date}
                              </td>
                              <td className="py-2.5 font-bold text-rose-600 dark:text-rose-400">
                                ₹{loan.amount.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 text-zinc-500 dark:text-zinc-400">
                                {loan.paymentMode || 'Cash'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Repayments Table */}
                {memberRepayments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      Repayments Received
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
                            <th className="py-2">Date</th>
                            <th className="py-2">Amount</th>
                            <th className="py-2">Payment Mode</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {memberRepayments.map((rep, idx) => (
                            <tr key={idx} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-800/10 transition-colors">
                              <td className="py-2.5 font-mono text-zinc-600 dark:text-zinc-400">
                                {rep.date}
                              </td>
                              <td className="py-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                                ₹{rep.amount.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 text-zinc-500 dark:text-zinc-400">
                                {rep.paymentMode || 'Cash'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
