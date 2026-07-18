import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  FileSpreadsheet,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  Upload,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { Member, ActiveTab } from '../types';
import { saveMember, deleteMember } from '../firebase';
import ConfirmModal from './ConfirmModal';

interface MembersProps {
  members: Member[];
  onNavigate: (tab: ActiveTab, memberNo?: string) => void;
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function Members({ members, onNavigate, addToast }: MembersProps) {
  // Search, filter, sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [sortField, setSortField] = useState<keyof Member>('memberNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals / forms state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Form states
  const [memberNo, setMemberNo] = useState('');
  const [memberName, setMemberName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  // Confirmation modal
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Sort
  const handleSort = (field: keyof Member) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter & Sort Members
  const filteredMembers = useMemo(() => {
    return members
      .filter((member) => {
        const matchesSearch =
          member.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.memberNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.address.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'All' || member.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        // Handle numeric memberNo comparison if applicable
        if (sortField === 'memberNo') {
          const numA = parseInt(a.memberNo, 10);
          const numB = parseInt(b.memberNo, 10);
          const isNumA = !isNaN(numA) && /^\d+$/.test(a.memberNo.trim());
          const isNumB = !isNaN(numB) && /^\d+$/.test(b.memberNo.trim());

          if (isNumA && isNumB) {
            return sortOrder === 'asc' ? numA - numB : numB - numA;
          }
          if (isNumA) return sortOrder === 'asc' ? -1 : 1;
          if (isNumB) return sortOrder === 'asc' ? 1 : -1;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc'
            ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
            : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
        }
        return 0;
      });
  }, [members, searchTerm, statusFilter, sortField, sortOrder]);

  // Open modal for add
  const openAddModal = () => {
    setEditingMember(null);
    setMemberNo((members.length + 1).toString()); // auto-suggest next member no
    setMemberName('');
    setPhone('');
    setAddress('');
    setStatus('Active');
    setIsModalOpen(true);
  };

  // Open modal for edit
  const openEditModal = (member: Member) => {
    setEditingMember(member);
    setMemberNo(member.memberNo);
    setMemberName(member.memberName);
    setPhone(member.phone);
    setAddress(member.address);
    setStatus(member.status);
    setIsModalOpen(true);
  };

  // Save / Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!memberNo.trim() || !memberName.trim()) {
      addToast('Please fill required fields', 'error');
      return;
    }

    // If adding, verify memberNo uniqueness
    if (!editingMember) {
      const exists = members.some((m) => m.memberNo === memberNo.trim());
      if (exists) {
        addToast(`Member Number ${memberNo} already exists!`, 'error');
        return;
      }
    }

    const newMember: Member = {
      id: memberNo.trim(),
      memberNo: memberNo.trim(),
      memberName: memberName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      status,
      createdAt: editingMember ? editingMember.createdAt : Date.now()
    };

    try {
      await saveMember(newMember);
      addToast(
        editingMember ? 'Member details updated successfully' : 'New Member added successfully',
        'success'
      );
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      addToast('Failed to save member details', 'error');
    }
  };

  // Delete flow
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;

    try {
      await deleteMember(deleteId);
      addToast(`Member ${deleteId} deleted successfully`, 'success');
      setDeleteId(null);
    } catch (err) {
      console.error(err);
      addToast('Failed to delete member', 'error');
    }
  };

  // Excel file import
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(worksheet);

        let importedCount = 0;
        let skippedCount = 0;

        for (const row of rows) {
          // Normalize column headers
          const mNo = (row['Member Number'] || row['Member No'] || row['ID'] || row['id'] || '').toString().trim();
          const mName = (row['Member Name'] || row['Name'] || row['name'] || '').toString().trim();
          const mPhone = (row['Phone Number'] || row['Phone'] || row['phone'] || '').toString().trim();
          const mAddress = (row['Address'] || row['address'] || '').toString().trim();
          const mStatusRaw = (row['Status'] || row['status'] || 'Active').toString().trim().toLowerCase();
          const mStatus = mStatusRaw === 'inactive' ? 'Inactive' : 'Active';

          if (!mNo || !mName) {
            skippedCount++;
            continue;
          }

          // Save row to firebase
          const memberObj: Member = {
            id: mNo,
            memberNo: mNo,
            memberName: mName,
            phone: mPhone,
            address: mAddress,
            status: mStatus,
            createdAt: Date.now()
          };

          await saveMember(memberObj);
          importedCount++;
        }

        addToast(`Successfully imported ${importedCount} members. Skipped ${skippedCount} invalid records.`, 'success');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error(err);
        addToast('Error parsing Excel file. Ensure it contains Member Number and Member Name.', 'error');
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </span>
            Members Directory
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage marriage fund members, active subscription states, and payment profiles.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleExcelImport}
            accept=".xlsx, .xls, .csv"
            className="hidden"
            id="excel-file-uploader"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl font-semibold text-xs flex items-center gap-2 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
            id="members-import-excel-btn"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Import from Excel
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            id="members-add-new-btn"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        </div>
      </div>

      {/* Search & Filtering Block */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by name, phone, address, member no..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-medium"
            id="members-search-input"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl shrink-0 w-full md:w-auto">
          {(['All', 'Active', 'Inactive'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setStatusFilter(filter);
              }}
              className={`flex-1 md:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                statusFilter === filter
                  ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
              id={`filter-members-${filter.toLowerCase()}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table & Data List */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="members-list-table">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400 dark:text-zinc-500 text-xs uppercase font-bold tracking-wider">
                <th
                  onClick={() => handleSort('memberNo')}
                  className="px-6 py-4 cursor-pointer hover:text-emerald-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Member No.
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('memberName')}
                  className="px-6 py-4 cursor-pointer hover:text-emerald-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Name
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-400 font-medium">
                    No members found matching selected criteria.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr
                    key={member.memberNo}
                    className="hover:bg-zinc-50/40 dark:hover:bg-zinc-800/20 transition-colors group"
                  >
                    {/* Member No */}
                    <td className="px-6 py-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {member.memberNo}
                    </td>

                    {/* Member Name */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => onNavigate('profile', member.memberNo)}
                        className="font-bold text-emerald-800 dark:text-emerald-400 hover:underline text-left cursor-pointer flex items-center gap-2 group-hover:translate-x-1 transition-transform"
                        id={`member-link-${member.memberNo}`}
                      >
                        <User className="w-4 h-4 shrink-0" />
                        {member.memberName}
                      </button>
                    </td>

                    {/* Phone */}
                    <td className="px-6 py-4 font-mono text-zinc-500 dark:text-zinc-400">
                      {member.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          {member.phone}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Address */}
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 max-w-xs truncate">
                      {member.address ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          {member.address}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {member.status === 'Active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-100 dark:border-emerald-900/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 text-xs font-bold border border-zinc-200 dark:border-zinc-700">
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => onNavigate('profile', member.memberNo)}
                          className="p-1.5 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          title="View Profile"
                          id={`view-profile-btn-${member.memberNo}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(member)}
                          className="p-1.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title="Edit Details"
                          id={`edit-member-btn-${member.memberNo}`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(member.memberNo)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          title="Delete Member"
                          id={`delete-member-btn-${member.memberNo}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
      </div>

      {/* Add / Edit Member Modal */}
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
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 p-5 text-white flex items-center justify-between">
                <h3 className="font-bold text-base" id="member-modal-title">
                  {editingMember ? 'Update Member Details' : 'Add New Member'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                  id="close-member-modal-btn"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Member No */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Member Number *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingMember}
                    value={memberNo}
                    onChange={(e) => setMemberNo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 disabled:bg-zinc-100 dark:disabled:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm font-bold"
                    placeholder="e.g. 1"
                    id="member-form-no-input"
                  />
                </div>

                {/* Member Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Member Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-sm"
                    placeholder="Enter full name"
                    id="member-form-name-input"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                    placeholder="e.g. +91 9876543210"
                    id="member-form-phone-input"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Address
                  </label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    placeholder="Enter home/office address"
                    id="member-form-address-input"
                  />
                </div>

                {/* Status Toggle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Status
                  </label>
                  <div className="flex gap-2">
                    {(['Active', 'Inactive'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          status === s
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-500 shadow-xs'
                            : 'bg-zinc-50 dark:bg-zinc-800/30 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                        }`}
                        id={`member-form-status-${s.toLowerCase()}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                    id="member-form-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
                    id="member-form-submit-btn"
                  >
                    {editingMember ? 'Update Details' : 'Add Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reusable Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Member"
        message={`Are you sure you want to delete member number ${deleteId}? This action cannot be undone and will permanently remove all associated payment data.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
