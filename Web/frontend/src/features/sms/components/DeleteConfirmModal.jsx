import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { closeDeleteModal } from '../../../store/slices/uiSlice';
import { Button } from '../../../components/common/ui';
import { backdrop, modal } from '../../../utils/motion';

export const DeleteConfirmModal = ({ onConfirm, loading = false }) => {
  const dispatch = useDispatch();
  const isOpen = useSelector((s) => s.ui.deleteModalOpen);
  const messageToDelete = useSelector((s) => s.ui.messageToDelete);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          variants={backdrop}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={() => dispatch(closeDeleteModal())}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          variants={modal}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-panel border border-line-strong shadow-2xl p-6"
          style={{ backgroundColor: 'var(--panel, #F5F6F5)' }}
        >
          <div className="flex items-start gap-4">
            <div className="grid place-items-center w-12 h-12 rounded-2xl bg-red-100 text-danger shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="flex-1">
              <h3 className="text-[17px] font-semibold text-ink">Confirm Deletion</h3>
              <p className="text-[13px] text-muted mt-1 leading-relaxed">
                Are you sure you want to delete this SMS from the database? This action is audited and cannot be undone.
              </p>

              {messageToDelete && (
                <div className="mt-3 p-3 rounded-xl bg-card border border-line text-[12px] text-ink-2">
                  <span className="font-semibold text-ink">From:</span> {messageToDelete.sender}
                </div>
              )}

              <div className="mt-5 flex items-center justify-end gap-2.5">
                <Button variant="ghost" onClick={() => dispatch(closeDeleteModal())}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  disabled={loading}
                  onClick={() => onConfirm(messageToDelete)}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete SMS</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DeleteConfirmModal;
