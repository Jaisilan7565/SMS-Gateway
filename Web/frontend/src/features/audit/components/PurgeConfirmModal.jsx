import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '../../../components/common/ui';
import { backdrop, modal } from '../../../utils/motion';

export const PurgeConfirmModal = ({ isOpen, onClose, onConfirm, isPending }) => {
  const [confirmInput, setConfirmInput] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    setConfirmInput('');
  };

  const handleClose = () => {
    setConfirmInput('');
    onClose();
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
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          variants={modal}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-panel border border-red-200/50 shadow-2xl p-6 sm:p-7"
          style={{ backgroundColor: 'var(--panel, #F5F6F5)' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 border border-rose-500/30 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-ink leading-tight">
                  Clean All Database Data?
                </h3>
                <p className="text-[12px] text-muted mt-0.5">
                  Irreversible System Reset
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded-full text-muted hover:text-ink cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description & List */}
          <div className="space-y-3 py-2 text-[13px] text-ink-2">
            <p className="leading-relaxed">
              This action will permanently purge all telemetry records and reset the system:
            </p>

            <div className="p-3.5 rounded-2xl bg-card border border-line space-y-1.5 text-[12px]">
              <div className="flex items-center gap-2 text-danger font-medium">
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Delete all synced SMS messages</span>
              </div>
              <div className="flex items-center gap-2 text-danger font-medium">
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Remove all registered Android devices</span>
              </div>
              <div className="flex items-center gap-2 text-danger font-medium">
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Delete all background sync requests</span>
              </div>
              <div className="flex items-center gap-2 text-danger font-medium">
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Delete all mobile test user accounts</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-900 text-[11px] font-semibold">
              <ShieldCheck className="w-4 h-4 text-brand-700 shrink-0" />
              <span>The Super Administrator account (admin@sms.com) will be preserved.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="md"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              size="md"
              onClick={handleConfirm}
              disabled={isPending}
              className="gap-1.5 shadow-sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Purging Database...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Purge All Data</span>
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PurgeConfirmModal;
