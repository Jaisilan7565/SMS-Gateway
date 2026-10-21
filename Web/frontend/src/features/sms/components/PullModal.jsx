import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Smartphone, Calendar, Layers, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import api from '../../../services/api';
import { closePullModal, setActiveSyncJob } from '../../../store/slices/uiSlice';
import { Button } from '../../../components/common/ui';
import CustomSelect from '../../../components/common/CustomSelect';
import { useToast } from '../../../components/common/Toast';
import { backdrop, modal } from '../../../utils/motion';

export const PullModal = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isOpen = useSelector((s) => s.ui.pullModalOpen);
  const selectedDevice = useSelector((s) => s.ui.selectedDevice);

  const [deviceId, setDeviceId] = useState(selectedDevice?._id || '');
  const [filterType, setFilterType] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [limit, setLimit] = useState(100);

  // Fetch list of connected devices
  const { data: devicesData, isLoading: loadingDevices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.get('/devices?limit=100'),
    enabled: isOpen
  });

  const devices = devicesData?.data?.devices || [];

  // Update deviceId if selectedDevice prop updates
  React.useEffect(() => {
    if (selectedDevice?._id) {
      setDeviceId(selectedDevice._id);
    } else if (devices.length > 0 && !deviceId) {
      setDeviceId(devices[0]._id);
    }
  }, [selectedDevice, devices, deviceId]);

  const selectedDev = devices.find((d) => d._id === deviceId);
  const isSelectedDevLoggedOut = selectedDev?.status === 'LOGGED_OUT';

  const deviceOptions = loadingDevices
    ? [{ value: '', label: 'Loading devices...', icon: Smartphone }]
    : devices.length === 0
    ? [{ value: '', label: 'No enrolled devices found', icon: Smartphone }]
    : devices.map((d) => {
        const isLoggedOut = d.status === 'LOGGED_OUT';
        const isOffline = d.status === 'OFFLINE';
        const statusLabel = isLoggedOut ? '🔴 Logged Out' : isOffline ? '⚪ Offline' : '🟢 Online';
        return {
          value: d._id,
          label: `${d.deviceName} (${d.model || 'Android'}) • ${statusLabel}`,
          subtitle: `${d.userId?.email || d.androidId}${isLoggedOut ? ' — User not signed in' : ''}`,
          icon: Smartphone
        };
      });

  // Pull Mutation
  const pullMutation = useMutation({
    mutationFn: (payload) => api.post('/sms/trigger-pull', payload),
    onSuccess: (res) => {
      const targetDev = devices.find((d) => d._id === deviceId);
      dispatch(
        setActiveSyncJob({
          requestId: res.data?._id,
          deviceName: targetDev?.deviceName || 'Android Device',
          status: 'triggered'
        })
      );
      showToast('Silent FCM Push dispatched to Android device. Awaiting incoming batch...', 'info');
      queryClient.invalidateQueries(['syncRequests']);
      dispatch(closePullModal());
    },
    onError: (err) => {
      showToast(err.message || 'Failed to trigger pull', 'error');
    }
  });

  if (!isOpen) return null;

  const handleTrigger = (e) => {
    e.preventDefault();
    if (!deviceId) {
      showToast('Please select an enrolled Android device', 'error');
      return;
    }
    if (isSelectedDevLoggedOut) {
      showToast('Cannot pull SMS: This device is currently logged out.', 'error');
      return;
    }

    pullMutation.mutate({
      deviceId,
      filterType,
      dateFrom: filterType === 'DATE_RANGE' ? dateFrom : undefined,
      dateTo: filterType === 'DATE_RANGE' ? dateTo : undefined,
      limit: Number(limit)
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          variants={backdrop}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={() => dispatch(closePullModal())}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          variants={modal}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full max-w-lg overflow-hidden rounded-[28px] bg-panel border border-line-strong shadow-2xl p-6 sm:p-7"
          style={{ backgroundColor: 'var(--panel, #F5F6F5)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-line mb-5">
            <div className="flex items-center gap-3">
              <div
                className="grid place-items-center w-10 h-10 rounded-2xl bg-brand-900 shadow-sm border border-brand-700/30"
                style={{ backgroundColor: 'var(--brand-900, #0D3A23)' }}
              >
                <Zap className="w-5 h-5 fill-current" style={{ color: 'var(--brand-400, #5DBD8B)' }} />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-ink">Trigger On-Demand SMS Pull</h3>
                <p className="text-[12px] text-muted">Silent high-priority FCM wake-up trigger</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => dispatch(closePullModal())}
              className="p-1 rounded-full text-muted hover:text-ink hover:bg-card cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleTrigger} className="space-y-4">
            {/* Target Device Selector */}
            <div>
              <label className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wider mb-1.5">
                Target Android Device
              </label>
              <CustomSelect
                value={deviceId}
                onChange={(val) => setDeviceId(val)}
                options={deviceOptions}
                icon={Smartphone}
                placeholder="Select Android Device..."
                size="md"
              />
              {isSelectedDevLoggedOut && (
                <div className="mt-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-900 text-[12px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>Device Logged Out:</strong> The user signed out from the mobile app. You cannot pull SMS until the user signs back in.
                  </span>
                </div>
              )}
            </div>

            {/* Filter Strategy */}
            <div>
              <label className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wider mb-2">
                Sync Filter Strategy
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'ALL',
                    label: 'All Inbox SMS',
                    desc: 'Full historical pull (Recommended)',
                    icon: Layers
                  },
                  {
                    id: 'DELTA_UNSYNCED',
                    label: 'Only Unsynced',
                    desc: 'Only new SMS after last watermark',
                    icon: Zap
                  },
                  {
                    id: 'TODAY',
                    label: "Today's SMS",
                    desc: 'From 00:00 to now',
                    icon: Clock
                  },
                  {
                    id: 'DATE_RANGE',
                    label: 'Custom Range',
                    desc: 'Between start & end dates',
                    icon: Calendar
                  }
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = filterType === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setFilterType(mode.id)}
                      className={`flex flex-col text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-brand-700 bg-brand-50 shadow-sm'
                          : 'border-line bg-card hover:border-line-strong'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-brand-800' : 'text-muted'}`} />
                        <span className={`text-[13px] font-semibold ${isSelected ? 'text-brand-900' : 'text-ink'}`}>
                          {mode.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted">{mode.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conditional Date Range pickers */}
            {filterType === 'DATE_RANGE' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-muted mb-1">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-xl bg-card border border-line-strong text-[13px] text-ink focus:outline-none focus:border-brand-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted mb-1">To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-xl bg-card border border-line-strong text-[13px] text-ink focus:outline-none focus:border-brand-700"
                  />
                </div>
              </div>
            )}

            {/* Batch Limit */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[12px] font-semibold text-ink-2 uppercase tracking-wider">
                  Maximum Record Limit
                </label>
                <span className="text-[12px] font-semibold text-brand-800 tnum">{limit} SMS</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-full accent-brand-700 cursor-pointer"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-line flex items-center justify-end gap-2.5">
              <Button variant="ghost" onClick={() => dispatch(closePullModal())}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={pullMutation.isPending || !deviceId || isSelectedDevLoggedOut}
                className="min-w-[140px]"
              >
                {pullMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Dispatch Pull</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PullModal;
