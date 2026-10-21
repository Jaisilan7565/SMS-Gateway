import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, X, Smartphone, ArrowRight } from 'lucide-react';
import { clearActiveSyncJob, setActiveSyncJob, setActiveTab } from '../../store/slices/uiSlice';

export const SyncProgressBanner = () => {
  const dispatch = useDispatch();
  const activeSyncJob = useSelector((s) => s.ui.activeSyncJob);

  useEffect(() => {
    if (activeSyncJob?.status === 'triggered' || activeSyncJob?.status === 'processing') {
      // Auto-timeout after 45 seconds if device did not respond
      const timeoutTimer = setTimeout(() => {
        dispatch(
          setActiveSyncJob({
            ...activeSyncJob,
            status: 'failed',
            error: 'Device did not respond within 45s. Phone may be asleep, offline, or logged out.'
          })
        );
      }, 45000);
      return () => clearTimeout(timeoutTimer);
    }

    if (activeSyncJob?.status === 'completed' || activeSyncJob?.status === 'failed') {
      const timer = setTimeout(() => {
        dispatch(clearActiveSyncJob());
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [activeSyncJob, dispatch]);

  if (!activeSyncJob) return null;

  const isProcessing = activeSyncJob.status === 'triggered' || activeSyncJob.status === 'processing';
  const isCompleted = activeSyncJob.status === 'completed';
  const isFailed = activeSyncJob.status === 'failed';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md p-3.5 sm:p-4 rounded-2xl bg-panel/95 backdrop-blur-md border border-line-strong shadow-hero flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
              isProcessing
                ? 'bg-brand-900 text-brand-400 border border-brand-700/40'
                : isCompleted
                ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
            }`}
          >
            {isProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
            {isCompleted && <CheckCircle2 className="w-5 h-5" />}
            {isFailed && <AlertCircle className="w-5 h-5" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold text-ink truncate">
                {isProcessing && 'Sync in Progress'}
                {isCompleted && 'Sync Successful!'}
                {isFailed && 'Sync Request Failed'}
              </span>
              <span className="text-[11px] text-muted truncate">
                • {activeSyncJob.deviceName || 'Android Device'}
              </span>
            </div>

            <p className="text-[12px] text-muted truncate mt-0.5">
              {isProcessing && 'Dispatched silent FCM. Waiting for encrypted batch...'}
              {isCompleted && `Ingested ${activeSyncJob.count ?? 0} messages safely via AES-256-GCM`}
              {isFailed && (activeSyncJob.error || 'Device could not process the request')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isCompleted && (
            <button
              type="button"
              onClick={() => {
                dispatch(setActiveTab('sms'));
                dispatch(clearActiveSyncJob());
              }}
              className="px-2.5 py-1 rounded-full bg-brand-800 text-white text-[11px] font-semibold hover:bg-brand-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>View</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            onClick={() => dispatch(clearActiveSyncJob())}
            className="p-1 rounded-full text-muted hover:text-ink hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SyncProgressBanner;
